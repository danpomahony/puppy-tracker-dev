variable "name" {
  description = "Name of the VM. Also used for its storage pool, disks and hostname."
  type        = string
}

variable "ip_address" {
  description = "Fixed IPv4 address on the libvirt network. Pick one that is not used by another VM."
  type        = string
}

variable "gateway" {
  description = "Address of the libvirt network's gateway and DNS server."
  type        = string
  default     = "192.168.122.1"
}

variable "network" {
  description = "Name of the existing libvirt network to attach to."
  type        = string
  default     = "default"
}

variable "memory_mib" {
  description = "Memory in MiB."
  type        = number
  default     = 2048
}

variable "vcpus" {
  description = "Number of virtual CPUs."
  type        = number
  default     = 2
}

variable "disk_gb" {
  description = "Size of the system disk in GB."
  type        = number
  default     = 20
}

variable "base_image_url" {
  description = "Ubuntu cloud image the VM is built from."
  type        = string
  default     = "https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img"
}

variable "ssh_public_key_path" {
  description = "Public key installed for the deploy user."
  type        = string
  default     = "~/.ssh/puppy_vm_ed25519.pub"
}

variable "pool_path" {
  description = "Directory on the host that holds this VM's disks."
  type        = string
}
