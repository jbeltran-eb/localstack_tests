# CDK PROJECT FOR HUNTERs (and others) INTEGRATION
---

## Description

This project is created for the deployment of the main elements that allow
the integration with Hunter:

- S3 cloudTrail Log (creation/import in future versions to avoid modify data)
- SNS Topic for CloudTrail , it will allow the *"FanOut"* to corresponding SQS Queues
  for integrations
- SQS Queue for Hunters
- S3 Event notification to SNS Cloudtrail for object creation
- SQS Subscription to the SNS CloudTrail 

## Pending/Future Tasks

- Additional tests (Currently passed all tests via *'localstack'*. Successfully deployed stack and resources on it)
- Migrate the Policies and Roles for Hunters from CFN/Terraform associated projects
- Include additional S3 Buckets,SNS Topics and SQS Queues for 
  integration with additional products

## Requirements

The only requirements to run this project are:

- Have access to an AWS Account
- Have configured the AWS CDK on the *"HOst"* running the project
- Recommended have configured the AWS CLI too

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template
