---
title: xfs recovery
description: This is a document about xfs recovery.
---


```bash
[root@DAS-OS data]# df -hT
Filesystem     Type      Size  Used Avail Use% Mounted on
devtmpfs       devtmpfs  128G   64K  128G   1% /dev
tmpfs          tmpfs     128G     0  128G   0% /dev/shm
tmpfs          tmpfs     128G  4.1G  124G   4% /run
tmpfs          tmpfs     128G     0  128G   0% /sys/fs/cgroup
/dev/sda4      ext4      196G   48G  139G  26% /
tmpfs          tmpfs     128G  256K  128G   1% /tmp
/dev/sda2      ext4      2.0G  189M  1.7G  11% /boot
/dev/sda1      vfat       50M  6.5M   44M  13% /boot/efi
tmpfs          tmpfs      26G     0   26G   0% /run/user/0
/dev/sda3      xfs        11T   75G   11T   1% /data

[root@DAS-OS data]# ls /data
[root@DAS-OS data]# du -sh /data
0       /data

# 重新挂载无果，使用[Fetching Title#bmln](https://github.com/ianka/xfs_undelete/archive/refs/tags/v12.1.tar.gz) 工具也无果，


```

```bash
[[SOLVED] Disk disappeared, then reappeared empty. How I recovered my data (XFS) - General Support - Unraid](https://forums.unraid.net/topic/51819-solved-disk-disappeared-then-reappeared-empty-how-i-recovered-my-data-xfs/)

# 备份磁盘
[root@DAS-OS ~]# dd if=/dev/sda3 of=/root/data.driver.img


mkdir /mnt/loop

mount -o ro,loop,offset=32256 harddrive.img /mnt/loop


losetup --offset 32256 /dev/loop2 harddrive.img
```