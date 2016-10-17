
This project uses the [ec2-expire-snapshots](https://github.com/alestic/ec2-expire-snapshots) CLI tool written in Perl to expire EBS snapshots using Lambda.

AWS Lambda does not directly support Perl, So [./index.js](./index.js) is provided as a simple Node.js wrapper to
call `ec2-expire-snapshots`.

## Usage

Modify `./index.js` to supply the arguments you want to pass to [ec2-expire-snapshots](https://github.com/alestic/ec2-expire-snapshots).


   npm run package-for-deploy

Upload and activate on AWS Lambda as usual.

Doing your first run with the `--noaction` flag is highly recommend. 

## How can this work?

AWS [supports running arbitrary executables in Lambda](https://aws.amazon.com/blogs/compute/running-executables-in-aws-lambda/).
As the linked post mentions is also clear that your code is running in a virtual machine running an instance of Amazon Linux.
Looking at the [package list for Amazon Linux](https://aws.amazon.com/amazon-linux-ami/2016.09-packages/) you can see that it
not only contains the Perl binary, but also all the dependencies of `ec2-expire-snapshots`

## Why not use a native Node.js or Python solution?

`ec2-expire-snapshots` is tried-and-true, tested by many people over several years-- an important quality when it comes to deleting
your backups selectively!

A native Node.js or Python solution would be nice for the long term, but this was faster to set up today.

## Related Projects

 * [lambda-function-wrapper](https://github.com/alestic/lambda-function-wrapper) provides a proof-of-concept for running Perl from Node.js
 * [SnapshotExpirationUtility](https://github.com/tangerinedream/SnapshotExpirationUtility) uses Python, but currently supports only a very simple retention rule and does not yet support Lambda 
 * [rotate-snapshot](https://github.com/szkkentaro/rotate-snapshot) is written in Node.js and supports Lambda, but also only supports a very simple retention rule, and isn't actively being updated at the moment.
 * [grandfatherson](https://github.com/ecometrica/grandfatherson) implements the useful Grandfather Father Son retention rule algorithm in Python, but it isn't yet integrated with a Python project that does snapshot deletion.

There are various projects that handle both snapshot creation and deletion in a single tool, but that underdesirable. By creating snapshots seperately on processes run on each host we have the ability to freeze the filesystem to insure consistency.



