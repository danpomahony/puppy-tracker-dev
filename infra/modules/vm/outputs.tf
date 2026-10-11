output "name" {
  value = libvirt_domain.this.name
}

output "ip_address" {
  value = var.ip_address
}

output "ssh" {
  description = "Command to log in once cloud-init has finished."
  value       = "ssh deploy@${var.ip_address}"
}
