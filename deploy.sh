#!/bin/bash

npm run build
if [[ $? -ne 0 ]]; then
    echo "Build failed. Exiting."
    exit 1
fi


cd build && aws s3 sync . s3://simple-graphing-app/

