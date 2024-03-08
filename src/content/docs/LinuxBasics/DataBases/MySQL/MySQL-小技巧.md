---
title: MySQL 小技巧
description: This is a document about MySQL 小技巧.
---

# MySQL小技巧汇总

- JSON中查询特定键对应的值

```sql
SELECT data -> '$.text_1' FROM ...				-- `->`写法等价于JSON_EXTRACT()
-- `->>`是JSON_EXTRACT() 和 JSON_UNQUOTE() 的等价写法
```

:link:更多JSON操作参考：https://www.cnblogs.com/muscleape/p/10064031.html

- 将字符串转换为数字

```sql
SELECT CAST('123' AS SIGNED);
SELECT CONVERT('123',SIGNED);
-- 三种方法，最后这种非常简单
SELECT '123'+0;
```

- 重命名数据库
```bash
# 注意直接使用RENAME DATABASE <old_name> TO <new_name> 会丢失部分数据，官方也不推荐该做法，可以使用一下脚本代理，注意有一行警告输出。
mysql -h rm-8vbhaq1jlv38l7qey.mysql.zhangbei.rds.aliyuncs.com -u tmp -p"xxx" canal_test -sNe 'show tables' | while read table; do mysql -u tmp -p"xxx" -sNe "RENAME TABLE canal_test.$table TO canal_test_bak_20230901.$table"; done


for table in question_data question_data_delete source_data std_question_data std_question_data_delete user_table; do mysql -h rm-8vbhaq1jlv38l7qey.mysql.zhangbei.rds.aliyuncs.com -u tmp -p"xxx" -sNe "RENAME TABLE canal_test.$table TO canal_test_bak_20230901.$table"; done

```
- 查看所有数据库或者单个数据库占用的空间大小
```sql
SELECT table_schema AS "Database", 
ROUND(SUM(data_length + index_length) / 1024 / 1024 / 1024, 2) AS "Size (GB)" 
FROM information_schema.tables
GROUP BY table_schema;


其中，ROUND函数将结果保留两位小数，data_length表示数据大小，index_length表示索引大小，information_schema.tables是 MySQL 系统数据库中用于存储关于所有表的信息的表。

如果要查看特定库的占用空间大小，可以在语句中加上 WHERE 条件，如：

SELECT table_schema AS "Database", 
ROUND(SUM(data_length + index_length) / 1024 / 1024 / 1024, 2) AS "Size (GB)"
FROM information_schema.tables
WHERE table_schema = 'your_database_name'
GROUP BY table_schema;
```
- 查看指定数据库的所有表的占用空间大小：
```sql
SELECT table_name, CONCAT(ROUND((DATA_LENGTH + INDEX_LENGTH) / (1024 * 1024 * 1024), 2), ' GB') AS size
FROM information_schema.TABLES 
WHERE table_schema = '<指定的数据库名>'
ORDER BY size DESC;

```