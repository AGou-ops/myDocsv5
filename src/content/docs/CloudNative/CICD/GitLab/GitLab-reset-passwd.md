---
title: GitLab reset passwd
description: This is a document about GitLab reset passwd.
---

# GitLab 重置密码

## GitLab in docker

1. 进入到容器当中

   ```bash
   $ docker exec -it gitlab /bin/bash
   ```

2. Ruby on Rails console

   ```bash
   $ gitlab-rails console -e production
   ```

3. 查找`root`用户

   ```ruby
   irb(main):006:0> user = User.where(id: 1).first
   ```

   - 或者按照邮箱查找用户

     ```ruby
     irb(main):006:0> user = User.find_by(email: 'admin@example.com')
     ```

4. 重置密码（要求不少于8位）

   ```ruby
   irb(main):006:0> user.password = 'suofeiya'
   irb(main):006:0> user.password_confirmation = 'suofeiya'
   ```

5. 保存更改

   ```ruby
   irb(main):006:0> user.save!
   ```

