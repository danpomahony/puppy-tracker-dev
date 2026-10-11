# The disposable VM. Use it to test provisioning changes, then destroy it.
# Build:   tofu init && tofu apply
# Remove:  tofu destroy

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

  name       = "puppy-scratch"
  ip_address = "192.168.122.10"
  pool_path  = "/var/lib/libvirt/images/puppy-scratch"
}

output "ssh" {
  value = module.vm.ssh
}
