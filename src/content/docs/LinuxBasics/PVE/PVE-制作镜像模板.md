---
title: PVE 制作镜像模板
description: This is a document about PVE 制作镜像模板.
---

## 创建虚拟机

创建虚拟机，ID和名称按照自己的喜好随便取：

![image-20230425100830230](https://cdn.agou-ops.cn/others/image-20230425100830230.png)

需要注意的是，在选择`操作系统`这一步中，不要选择任何介质，如下图所示：

![image-20230425100850424](https://cdn.agou-ops.cn/others/image-20230425100850424.png)

## 预先准备

添加``cloudinit`设备，懒得详细说了，看图就好。



![image-20230425101141301](https://cdn.agou-ops.cn/others/image-20230425101141301.png)



添加完设备之后，就可以配置`Cloud-Init`镜像初始化的一些选项了.

- 用户、密码
- DNS域、DNS服务器
- SSH公钥：这里可以添加一些自己的SSH公钥，方便远程链接；
- IP配置：这里我使用DHCP，当然可以静态或者不指定。

![image-20230425101319288](https://cdn.agou-ops.cn/others/image-20230425101319288.png)

## 制作镜像

ssh或者使用web gui连接到**pve主机**里面（注意是PVE主机）：

```bash
# 下载ubuntu的cloud image到pve主机上
wget https://cloud-images.ubuntu.com/minimal/releases/jammy/release/ubuntu-22.04-minimal-cloudimg-amd64.img

# 添加串行设备到vm，注意vm ID改成自己的
# qm set <VM ID> --serial0 socket --vga serial0
qm set 901 --serial0 socket --vga serial0

# 修改上面下载的镜像拓展名，重要，不然会莫名其妙失败，（PVE社区里的人说的，具体我没实验过。。。懒）
mv ubuntu-22.04-minimal-cloudimg-amd64.img ubuntu-22.04.qcow2

# 修改镜像的大小，16G，32G都可，这里决定了系统卷的大小
qemu-img resize ubuntu-22.04.qcow2 32G

# 将做好的镜像导入到local-lvm中
qm importdisk 901 ubuntu-22.04.qcow2 local-lvm


tar xf windows_server_2012_r2_standard_eval_kvm_20170321.qcow2.gz
mv windows_server_2012_r2_standard_eval_kvm_20170321.qcow2 windows2012.qcow2
qemu-img resize windows2012.qcow2 200G
qm importdisk 905 windows2012.qcow2 local-lvm
```

实操过程如下所示：

![image-20230425102049860](https://cdn.agou-ops.cn/others/image-20230425102049860.png)

最后一步传输完成之后，再次打开硬件选项，并双击``未使用的磁盘0`进行添加.

![image-20230425102250678](https://cdn.agou-ops.cn/others/image-20230425102250678.png)

添加未使用的磁盘的时候，注意如果你的硬盘是`SSD`的话，可以打开以下两个选项：

![image-20230425102337780](https://cdn.agou-ops.cn/others/image-20230425102337780.png)

:warning:然后注意将新添加的磁盘，设置为优先启动项，如下图所示：

![image-20230425102542661](https://cdn.agou-ops.cn/others/image-20230425102542661.png)

下面的开机自启动，随意。

![image-20230425102628195](https://cdn.agou-ops.cn/others/image-20230425102628195.png)

## 转换成模板

启动该主机模板，对主机进行一系列的初始化，比如网络配置、hosts、nameserver、一些基础服务、编译软件包等等，完成之后关机，然后就可以转换成模板了。

```bash
# 最好在模板主机里把下面这个客户端工具安装上，这样就可以直接在PVE里看到主机的一些基本信息，比如IP
apt install qemu-guest-agent
```



![image-20230425102707131](https://cdn.agou-ops.cn/others/image-20230425102707131.png)

右键点击`克隆`，根据需求进行设置就行了。

![image-20230425102832835](https://cdn.agou-ops.cn/others/image-20230425102832835.png)

Done.
