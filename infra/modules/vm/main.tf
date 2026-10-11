# One Ubuntu VM on a local libvirt host: its own storage pool, a disk backed by the
# cloud image, a cloud-init disk, and the VM itself.

resource "libvirt_pool" "this" {
  name = var.name
  type = "dir"

  target = {
    path = var.pool_path
  }

  create = {
    build     = true
    start     = true
    autostart = true
  }

  destroy = {
    delete = true
  }
}

# The downloaded cloud image. The system disk below is a copy-on-write layer on top of it.
resource "libvirt_volume" "base" {
  name = "${var.name}-base.qcow2"
  pool = libvirt_pool.this.name

  target = {
    format = {
      type = "qcow2"
    }
  }

  create = {
    content = {
      url = var.base_image_url
    }
  }
}

resource "libvirt_volume" "system" {
  name     = "${var.name}-system.qcow2"
  pool     = libvirt_pool.this.name
  capacity = var.disk_gb * 1024 * 1024 * 1024

  target = {
    format = {
      type = "qcow2"
    }
  }

  backing_store = {
    path = libvirt_volume.base.path

    format = {
      type = "qcow2"
    }
  }
}

resource "libvirt_cloudinit_disk" "this" {
  name = "${var.name}-cloudinit"

  user_data = templatefile("${path.module}/cloud-init.yaml.tftpl", {
    name           = var.name
    ssh_public_key = trimspace(file(pathexpand(var.ssh_public_key_path)))
  })

  meta_data = <<-EOF
    instance-id: ${var.name}
    local-hostname: ${var.name}
  EOF

  network_config = templatefile("${path.module}/network-config.yaml.tftpl", {
    ip_address = var.ip_address
    gateway    = var.gateway
  })
}

resource "libvirt_volume" "cloudinit" {
  name = "${var.name}-cloudinit.iso"
  pool = libvirt_pool.this.name

  create = {
    content = {
      url = libvirt_cloudinit_disk.this.path
    }
  }
}

resource "libvirt_domain" "this" {
  name      = var.name
  type      = "kvm"
  memory    = var.memory_mib * 1024 # the provider takes KiB
  vcpu      = var.vcpus
  running   = true
  autostart = var.autostart

  os = {
    type         = "hvm"
    type_arch    = "x86_64"
    type_machine = "q35"
  }

  devices = {
    disks = [
      {
        source = {
          volume = {
            pool   = libvirt_volume.system.pool
            volume = libvirt_volume.system.name
          }
        }
        target = {
          bus = "virtio"
          dev = "vda"
        }
        driver = {
          type = "qcow2"
        }
      },
      {
        device = "cdrom"
        source = {
          volume = {
            pool   = libvirt_volume.cloudinit.pool
            volume = libvirt_volume.cloudinit.name
          }
        }
        target = {
          bus = "sata"
          dev = "sda"
        }
      },
    ]

    interfaces = [
      {
        type  = "network"
        model = { type = "virtio" }
        source = {
          network = {
            network = var.network
          }
        }
      },
    ]

    # VNC for debugging a VM that will not boot. Reachable from this machine only.
    graphics = [
      {
        vnc = {
          auto_port = true
          listen    = "127.0.0.1"
        }
      },
    ]
  }
}
