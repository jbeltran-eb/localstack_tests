    //ROLE SECTIONs

    //HUNTERs:
    //
  
      //WIZ:
      const WizAccessIamRole = new iam.Role(this,'WizAccessIamRole',{
        assumedBy: new iam.AccountPrincipal(WizAccountId),
        externalIds: [WizExternalId],
        roleName: WizRoleName,
      });
  
  
      //POLICY SECTIONs
      // Note: 
      //  - Move to specific and separated construct in future. 
      //
  
      // HUNTERs POLICY:
      //
      const HuntersCloudTrailBucketAccessPolicyStatements = [
        new iam.PolicyStatement({
          sid: 'BucketsAccess',
          effect: iam.Effect.ALLOW,
          actions: [
            's3:ListBucket',
            's3:GetObject',
            's3:GetBucketLocation',
            's3:GetBucketNotification',
            's3:PutBucketNotification',
          ],
          resources: [
            `arn:aws:s3:::${CloudTrailBucketName}`,
            `arn:aws:s3:::${CloudTrailBucketName}/*`
  
          ],
        }),
        new iam.PolicyStatement({
          sid: 'HuntersIngestionList',
          effect: iam.Effect.ALLOW,
          actions: [
            's3:ListAllMyBuckets',
            'sns:ListTopics',
          ],
          resources: ['*'],
        }),
        new iam.PolicyStatement({
          sid: 'HuntersIngestionNotificationsSetup',
          effect: iam.Effect.ALLOW,
          actions: [
            'sns:ListSubscriptionsByTopic',
            'sns:GetTopicAttributes',
            'sns:SetTopicAttributes',
            'sns:CreateTopic',
            'sns:TagResource',
            'sns:Publish',
            'sns:Subscribe',
          ],
          resources: ['arn:aws:sns:*:*:hunters?ingestion*'],
        }),
        new iam.PolicyStatement({
          sid: 'HuntersIngestionNotificationsTeardown',
          effect: iam.Effect.ALLOW,
          actions: [
            'sns:Unsubscribe',
            'sns:DeleteTopic',
          ],
          resources: ['arn:aws:sns:*:*:hunters?ingestion*'],
        }),
      ];
  
      // Only add KMS when decrypt required:
      if (HuntersKmsArns && HuntersKmsArns.length > 0) {
        HuntersCloudTrailBucketAccessPolicyStatements.push(new iam.PolicyStatement({
          sid: 'BucketsDecrypt',
          effect: iam.Effect.ALLOW,
          actions: ['kms:Decrypt'],
          resources: [ `${HuntersKmsArns}` ],
        }));
      }
  
      const HuntersCloudTrailBucketAccessIamPolicy = new iam.Policy(this, 'HuntersCloudTrailBucketAccessIamPolicy', {
        statements: HuntersCloudTrailBucketAccessPolicyStatements,
        policyName: HuntersCloudTrailBucketAccessIamPolicyName
      });
  
      //WIZ POLICY
      //
      const WizCloudTrailBucketAccessPolicyStatements = [
        new iam.PolicyStatement({
          sid: 'AllowWizAccessCloudtrailS3ListGetLocation',
          effect: iam.Effect.ALLOW,
          actions: [
            's3:GetBucketLocation',
            's3:ListBucket'
          ],
          resources: [`arn:aws:s3:::${CloudTrailBucketName}`],
          conditions: {
            'Bool': {
              'aws:SecureTransport': 'true'
            }
          }
        }),
        new iam.PolicyStatement({ 
          sid: 'AllowWizAccessCloudtrailS3Get',
          effect: iam.Effect.ALLOW,
          actions: [
            's3:GetObject'
          ],
          resources: [`arn:aws:s3:::${CloudTrailBucketName}/*`],
          conditions: {
            'Bool': {
              'aws:SecureTransport': 'true'
            }
          }
        }),
      ];
  
      const WizCloudTrailBucketAccessIamPolicy = new iam.Policy(this, 'WizCloudTrailBucketAccessIamPolicy', {
        statements: WizCloudTrailBucketAccessPolicyStatements,
        policyName: WizCloudTrailBucketAccessIamPolicyName
      });
  
      //ATTACHING ROLES AND POLICIES FOR SPECIFIC PRODUCTs
      //
  
  
      //WIZ:
      WizCloudTrailBucketAccessIamPolicy.attachToRole(WizAccessIamRole);
  
  
      //ATTACHING POLICIES FOR SNS and SQS:
  
      // CloudTrail Bucket Policy: - SNS Notify
      //
      const CloudTrailBucketPolicyForSNSStatements = [
        new iam.PolicyStatement({
          sid: 'AllowAWSS3Notification',
          effect: iam.Effect.ALLOW,
          principals: [new iam.ServicePrincipal('s3.amazonaws.com')],
          actions: ['SNS:Publish'],
          resources: [TLZCloudtrailLogsEventTopic.topicArn],
          conditions: {
            'StringEquals': {
              'aws:SourceAccount': `${MainAWSAccount}`,
            },
            'ArnLike': {
              'aws:SourceArn': `arn:aws:s3:*:*:${ListOfS3Buckets[0]}`,
            },
          },
        }),
      ];
  
      const TLZCloudtrailLogsEventTopicPolicy = new sns.TopicPolicy(this, 'TLZCloudtrailLogsEventTopicPolicy', {
        topics: [TLZCloudtrailLogsEventTopic],
      });
      
      TLZCloudtrailLogsEventTopicPolicy.document.addStatements(CloudTrailBucketPolicyForSNSStatements[0]);
  
      // CloudTrail SNS Policy: SQS Notify for Wiz
      const CloudTrailSNSPolicyForSQSWizStatements = [
        new iam.PolicyStatement({
          sid: 'Allow-SNS-SendMessage',
          effect: iam.Effect.ALLOW,
          principals: [new iam.ServicePrincipal('sns.amazonaws.com')],
          actions: ['sqs:SendMessage'],
          resources: [WizCloudTrailsQueue.queueArn],
          conditions: {
            ArnEquals: {
              'aws:SourceArn': TLZCloudtrailLogsEventTopic.topicArn,
            },
          },
        }),
        new iam.PolicyStatement({
          sid: 'Allow-WizAccess-RecvDeleteMsg',
          effect: iam.Effect.ALLOW,
          principals: [new iam.ArnPrincipal(WizAccessIamRole.roleArn)],
          actions: ['sqs:DeleteMessage', 'sqs:ReceiveMessage'],
          resources: [WizCloudTrailsQueue.queueArn],
        }),
      ]
  
      const CloudTrailSNSPolicyForSQSWiz = new sqs.QueuePolicy(this, 'CloudTrailSNSPolicyForSQSWiz', {
        queues: [WizCloudTrailsQueue],
      });
  
      CloudTrailSNSPolicyForSQSWiz.document.addStatements(CloudTrailSNSPolicyForSQSWizStatements[0],CloudTrailSNSPolicyForSQSWizStatements[1]);
  
  