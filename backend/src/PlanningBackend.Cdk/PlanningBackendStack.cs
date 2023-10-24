using System.Collections.Generic;
using Amazon.CDK;
using Amazon.CDK.AWS.APIGateway;
using Amazon.CDK.AWS.DynamoDB;
using Amazon.CDK.AWS.IAM;
using Amazon.CDK.AWS.Lambda;
using Constructs;

namespace PlanningBackend.Cdk
{
    public class PlanningBackendStack : Stack
    {
        internal PlanningBackendStack(Construct scope, string id, IStackProps props = null) : base(scope, id, props)
        {

            var tableName = "planning-sessions";

            var table = new Table(this, "PlanningSessionsTable", new TableProps
            {
                BillingMode = BillingMode.PAY_PER_REQUEST,
                TableName = tableName,
                PartitionKey = new Attribute
                {
                    Name = "SessionId",
                    Type = AttributeType.STRING
                },
                SortKey = new Attribute
                {
                    Name = "AdminId",
                    Type = AttributeType.STRING
                }
            });

            var lambdaHandlerRole = new Role(this, "DynamoDbHandlerRole", new RoleProps()
            {
                RoleName = "PlanningSessionsHandlerRole",
                Description = "Role assumed by the PlanningSessionsLambdaFunction",
                AssumedBy = new ServicePrincipal("lambda.amazonaws.com"),
            });
            lambdaHandlerRole.AddManagedPolicy(ManagedPolicy.FromAwsManagedPolicyName("CloudWatchLogsFullAccess"));

            var apiGatewayIntegrationRole = new Role(this, "PlanningSessionsApiGatewayIntegrationRole", new RoleProps()
            {
                AssumedBy = new ServicePrincipal("apigateway.amazonaws.com"),
            });

            var functionAsset = Code.FromAsset("./src/PlanningSessionFunctions/PlanningSessionFunctions/bin/Debug/net6.0");

            var createSessionHandler = new Function(this, "PlanningCreateSessionHandler", new FunctionProps()
            {
                Runtime = Runtime.DOTNET_6,
                Timeout = Duration.Seconds(30),
                Environment = new Dictionary<string, string>(1)
                {
                    {"SESSIONS_TABLE_NAME", tableName}
                },
                Code = functionAsset,
                Handler = "PlanningSessionFunctions::PlanningSessionFunctions.Function::CreateSessionHandler",
                Role = lambdaHandlerRole
            });

            var joinSessionHandler = new Function(this, "PlanningJoinSessionHandler", new FunctionProps()
            {
                Runtime = Runtime.DOTNET_6,
                Timeout = Duration.Seconds(30),
                Environment = new Dictionary<string, string>(1)
                {
                    {"SESSIONS_TABLE_NAME", tableName}
                },
                Code = functionAsset,
                Handler = "PlanningSessionFunctions::PlanningSessionFunctions.Function::JoinSessionHandler",
                Role = lambdaHandlerRole
            });

            var apiGateway = new RestApi(this, "PlanningSessionsApi", new RestApiProps()
            {
                RestApiName = "PlanningSessionsApi",
                DefaultCorsPreflightOptions = new CorsOptions
                {
                    AllowOrigins = Cors.ALL_ORIGINS,
                    AllowMethods = Cors.ALL_METHODS,
                }
            });

            apiGateway.Root.AddMethod("ANY");

            var sessionsResource = apiGateway.Root.AddResource("sessions");
            sessionsResource.AddMethod("POST", new LambdaIntegration(createSessionHandler));
            createSessionHandler.GrantInvoke(apiGatewayIntegrationRole);

            var sessionResource = sessionsResource.AddResource("{session}");

            var joinResource = sessionResource.AddResource("join");
            joinResource.AddMethod("POST", new LambdaIntegration(joinSessionHandler));

            table.GrantReadWriteData(lambdaHandlerRole);
        }
    }
}
