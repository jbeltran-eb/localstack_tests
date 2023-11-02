    // Global Dynamic Vars:
    // (Organized by Resource)
    //
    let ListOfS3Buckets: string[] = [
        `${CloudTrailBucketName}`,
        `tlz-config-central-${MainAWSAccount}`,
        `tlz-guardduty-central-${MainAWSAccount}`,
        `tlz-vpc-flowlogs-central-${MainAWSAccount}`,
      ];
  
      let TLZConfigBucket: s3.IBucket;
      let TLZGuardDutyBucket: s3.IBucket;
      let TLZVPCFlowLogsBucket: s3.IBucket;
  
      let TLZCloudtrailLogsEventTopic: sns.ITopic;
      let TLZConfigLogsEventTopic: sns.ITopic;
      let TLZGuardDutyLogsEventTopic: sns.ITopic;
      let TLZVPCFlowLogsEventTopic: sns.ITopic;
  
      // --- MAIN STACK CREATION --
  
  
      // Create (or import) the S3 Buckets:
      //
      if (CreateListOfS3Buckets){
  
          //[0] WAS MIGRATED!! :-) 
  
          TLZConfigBucket = new s3.Bucket(this, ListOfS3Buckets[1], {
          removalPolicy: cdk.RemovalPolicy.RETAIN,
          autoDeleteObjects: false,
          versioned: false
        });
  
          TLZGuardDutyBucket = new s3.Bucket(this, ListOfS3Buckets[2], {
          removalPolicy: cdk.RemovalPolicy.RETAIN,
          autoDeleteObjects: false,
          versioned: false
        });
  
          TLZVPCFlowLogsBucket = new s3.Bucket(this, ListOfS3Buckets[3], {
          removalPolicy: cdk.RemovalPolicy.RETAIN,
          autoDeleteObjects: false,
          versioned: false
        });
  
      }else{
        //[0] WAS MIGRATED!! :-) 
        TLZConfigBucket = s3.Bucket.fromBucketName(this, ListOfS3Buckets[1], ListOfS3Buckets[1]);
        TLZGuardDutyBucket = s3.Bucket.fromBucketName(this, ListOfS3Buckets[2], ListOfS3Buckets[2]);
        TLZVPCFlowLogsBucket = s3.Bucket.fromBucketName(this, ListOfS3Buckets[3], ListOfS3Buckets[3]);
  
      }
  
      //Create the SNS Topics:
      //
      if (CreateSNSTopics){
  
        //CLOUDTRAIL: MIGRATED!!

        // Config Central:
        TLZConfigLogsEventTopic = new sns.Topic(this, 'TLZConfigLogsEventTopic', {
          topicName: 'config-logs-notify'
        });
  
        // GuardDuty:
        TLZGuardDutyLogsEventTopic = new sns.Topic(this, 'TLZGuardDutyLogsEventTopic', {
          topicName: 'guardduty-logs-notify'
        });
  
        // VPC-FlowLogs:
        TLZVPCFlowLogsEventTopic = new sns.Topic(this, 'TLZVPCFlowLogsEventTopic', {
          topicName: 'vpcflow-logs-notify'
        });
  
      }else{
        
        //CLOUDTRAIL: MIGRATED!!

  
      }
  
      // Binds the S3 buckets to the SNS Topics via notifications: 
      // [Enable Outside of Localstack DevEnv Only - Use local var]
      // Note:
      //  - Unfortunately localstack free-tier doesn't allow test this correctly.
      //    Notification is not supported at this layer. 
      //  - Currently AWS CDK not allow import S3 Bucket Existing notifications
      //
      if (EnableS3SNSEventNotification){
  
        TLZCloudTrailBucket.addEventNotification(
          // Modify the `s3.EventType.*` to handle other object operations.
          s3.EventType.OBJECT_CREATED_PUT,
          new s3Notifications.SnsDestination(TLZCloudtrailLogsEventTopic),
        );
  
        TLZConfigBucket.addEventNotification(
          // Modify the `s3.EventType.*` to handle other object operations.
          s3.EventType.OBJECT_CREATED_PUT,
          new s3Notifications.SnsDestination(TLZConfigLogsEventTopic),
        );
  
        TLZGuardDutyBucket.addEventNotification(
          // Modify the `s3.EventType.*` to handle other object operations.
          s3.EventType.OBJECT_CREATED_PUT,
          new s3Notifications.SnsDestination(TLZGuardDutyLogsEventTopic),
        );
  
        TLZVPCFlowLogsBucket.addEventNotification(
          // Modify the `s3.EventType.*` to handle other object operations.
          s3.EventType.OBJECT_CREATED_PUT,
          new s3Notifications.SnsDestination(TLZVPCFlowLogsEventTopic),
        );
  
      };
  