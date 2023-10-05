# Hunter Terraform
---

## Author 

- Name   : Jose Maria Beltran Vargas
- GitHub : jbeltran-eb

## Description

This module generate the different policies required for the integration 
of AWS S3 Buckets 

Although it's executable without errors under "localstack" is pending to test 
in AWS Prod Envs.

## How to test this module

Execute the example contained under the corresponding directory of this module and
modify the parameters as required.

Example of execution:

```zsh
cd example

terraform init

terraform plan

terraform apply
```

*Notes:* 

- Remove the comments for providers and terraform provider if you are  running the module
  in final environment. These elements are commented to allow the current localstack tests
- Remove the ".backup" in the provider.tf.backup if you need the file.
