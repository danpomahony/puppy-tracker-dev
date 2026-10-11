# Setting up the VM tooling

One-time setup for building the local VMs described in [ADR 0003](adr/0003-develop-locally-release-to-a-production-vm.md). It assumes Ubuntu 24.04 in WSL2 with systemd enabled (`systemd=true` in `/etc/wsl.conf`). You need `sudo`.

## 1. Check that virtualization works

```sh
ls -l /dev/kvm            # should exist
grep -cE 'vmx|svm' /proc/cpuinfo   # should be more than 0
```

If `/dev/kvm` is missing, nested virtualization is off. WSL2 needs a recent kernel, and the Windows host must allow it. If it cannot be made to work, use the fallback in the ADR.

## 2. Install the tools

```sh
sudo apt update
sudo apt install -y qemu-system-x86 libvirt-daemon-system libvirt-clients virtinst cloud-image-utils ansible
sudo usermod -aG kvm,libvirt "$USER"
```

OpenTofu is not in Ubuntu's repositories. Download the official installer, read it, then run it:

```sh
curl --proto '=https' --tlsv1.2 -fsSL https://get.opentofu.org/install-opentofu.sh -o /tmp/install-opentofu.sh
less /tmp/install-opentofu.sh
sudo sh /tmp/install-opentofu.sh --install-method deb
```

From Windows (PowerShell), run `wsl --shutdown`, then reopen the terminal. The group change only applies to new sessions.

## 3. Check it

```sh
id -nG                                  # includes kvm and libvirt
virsh -c qemu:///system list --all      # an empty table, no error
virsh -c qemu:///system net-list --all  # "default" is active
tofu version
ansible --version
```

libvirt starts on demand through a socket, so `systemctl is-active libvirtd` may say `inactive` while `virsh` works. The `default` network is NAT on `192.168.122.0/24`. VMs on it can reach the internet, and WSL can reach them. Phones and Windows cannot.

## 4. SSH key for the VMs

Use a key that is only for the VMs, not the one used for GitHub.

```sh
ssh-keygen -t ed25519 -a 64 -C "puppy-tracker vm access" -f ~/.ssh/puppy_vm_ed25519
```

This key has **no passphrase**, so OpenTofu and Ansible work without an agent. That is acceptable because it only opens local VMs behind NAT. Do not use it for anything else. A real host (the PC, the Pi or a cloud server) gets a new key with a passphrase.

Add a block to `~/.ssh/config` so ssh never offers another key to the VMs:

```
Host 192.168.122.*
    User deploy
    IdentityFile ~/.ssh/puppy_vm_ed25519
    IdentitiesOnly yes
    StrictHostKeyChecking accept-new
```

Do not use SSH agent forwarding to the VMs.

## Troubleshooting

- **`Permission denied` on `/dev/kvm` or the libvirt socket:** the group change has not applied. Run `wsl --shutdown` from Windows and reopen the terminal.
- **`virsh` cannot connect:** run `sudo systemctl start libvirtd` and try again.
- **A VM does not get an address:** check `virsh -c qemu:///system net-list --all` and start the network with `virsh -c qemu:///system net-start default`.
