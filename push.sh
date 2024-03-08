#!/bin/sh
git add -A
git commit -m "rebuilding site $(date)"
git push

open "https://github.com/AGou-ops/myDocsv5/actions"
