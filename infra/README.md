# Infrastructure

OpenTofu code that creates the VMs described in [ADR 0003](../docs/adr/0003-develop-locally-release-to-a-production-vm.md). Set up the tools first with [the setup guide](../docs/infra-setup.md).

```
infra/
  modules/vm/   one Ubuntu VM: storage pool, disks, cloud-init and the VM itself
  scratch/      a disposable VM for testing provisioning changes
```

## Scratch VM

```sh
cd infra/scratch
tofu init
tofu apply        # about a minute, mostly the image download
ssh -i ~/.ssh/puppy_vm_ed25519 deploy@192.168.122.10
tofu destroy      # removes the VM, its disks and its storage pool
```

The VM gets a fixed address on libvirt's `default` network, the `deploy` user with your key and passwordless sudo, key-only SSH, and nothing else. Ansible does the rest.

After a rebuild the VM has a new host key, so ssh refuses the old one. Run `ssh-keygen -R 192.168.122.10` first.

State files stay on this machine (they are ignored by git). The provider lock file `.terraform.lock.hcl` is committed so everyone uses the same provider build.
