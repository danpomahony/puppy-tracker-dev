# The production VM. The family's app runs here (see ADR 0003).
# It keeps data, so do not destroy it casually. Test changes on ../scratch first.
# Build:  tofu init && tofu apply

terraform {
  required_version = ">= 1.6"

  required_providers {
    libvirt = {
      source  = "dmacvicar/libvirt"
      version = "~> 0.9.9"
    }
  }
}

provider "libvirt" {
  uri = "qemu:///system"
}

module "vm" {
  source = "../modules/vm"

  name       = "puppy-prod"
  ip_address = "192.168.122.20"
  pool_path  = "/var/lib/libvirt/images/puppy-prod"
  autostart  = true
}

output "ssh" {
  value = module.vm.ssh
}
