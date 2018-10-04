
Use AWS Lambda to expire EBS snapshot with flexible retention rules.

## Why Use Lambda to expire snapshots?

Some EBS snapshot management tools combine creating and expiring snapshots into a single tool.

Snapshot creation should be done from the host, where you have the flexibility to do things like freeze the filesystem or pause a service during the freeze.

However, deleting snapshots should *not* be done from hosts. When that pattern is used, it means a comprimise of a server can lead to deletion of the backups of the server as well.

AWS Lambda is very inexpensive and runs independently of any host

## Why use this snapshot deletion tool?

  * Flexible retention rules
  * Test coverage
  * Multiple retention policies using a single Lambda function.
  * Multiple region support

Our flexible retention rules are implemented by the [grandfatherson](https://github.com/RideAmigosCorp/grandfatherson) module, which has it's own test coverage to confirm the algorithm is working as expected.

The code here is also split into functions that are unit tested, expecting where we actually make the AWS calls.

Deleting the right data and not too much of it is incredibly important feature for a tool that deletes backups. Yet many tools that offer to help you delete your snapshots have no test coverage to confirm that they are working as expected.

## Usage

Use this command to create a .zip file to upload to AWS Lambda.

   npm run package-for-deploy

Create a new Lambda function in the AWS management console or via CLI and choose "Upload a .zip file" for the code entry type. 

Make sure an IAM role with the apporopriate snapshot policy is available for the execution role. 

To create a trigger, visit AWS Cloudwatch and create a new event rule

Select the "cron" option and express the schedule you want to run your snapshots on. For example, every day at 3 AM UTC would look like this:


    0 3 * * ? *

Choose to customize the event to send "Constant JSON". This is where your express
your configuration. An example is in [./example-event.json](./example-event.json)
which looks like this:

```json
    {
      "dryRun" : true,
      "retentionRules" : {
         "days"   : 14,
         "weeks"  : 13,
         "months" : 12
      },
      "filters": [ { "Name" : "tag:Name", "Values" : ["automated-backup" ] } ],
      "regions" : ["us-east-1","ca-central-1"],
    }
```

As would you guess, `dryRun` produces logging output, but takes no action. Highly recommended to try this first. For all the options for `retentionRules`,
see [grandfatherson](https://github.com/RideAmigosCorp/grandfatherson).

The `filters` are used to select which snapshots you want to prune. For the full list of options see the [docs for the AWS EC2 DescribeVolumes](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_DescribeVolumes.html) API call.

`regions` is used to set the regions you want expire your snapshots in. One Lambda function can expire snapshots in other regions besides where the Lambda is hosted. The default value is the region where the Lambda is running.

In the above example, we are searching for all snapshots where the tag "Name" has the value 'automated-backup'

### Implementing multiple retention rules

Say you want to apply a different retention policy to some backups, like your database data. There are two simple steps to do that:

  1. Use a different `filters` to find them. For example, give them a different tag that you can search for.
  2. Use CloudWatch to create a second Event Rule that's attached to the same AWS Lambda function.

## Testing / Dry Run

After doing a dry-run, you can view the related log stream in CloudWatch to confirm that you would be retaining and deleting what you expected. The diagnotics could improved here. Patches welcome.

## Logging

During live runs, we log the IDs of snapshots deleted to CloudWatch. Patches would be welcome to create more detailed logging that might include the related volume-ID or other details of the snapshots deleted.

## Contributing

Bug fixes and feature contributions are welcome, just be prepared to implement your own feature requests.

## Author

Mark Stosberg <mark@rideamigos.com>

## LICENSE

Apache 2. See [LICENSE](./LICENSE)


