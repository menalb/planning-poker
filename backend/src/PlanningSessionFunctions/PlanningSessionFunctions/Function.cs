using System.Net;
using System.Text.Json;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;
using Amazon.DynamoDBv2.Model;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;

// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace PlanningSessionFunctions;

public class Function
{

    private readonly AmazonDynamoDBClient _dynamoDbClient;
    private readonly string TableName = Environment.GetEnvironmentVariable("SESSIONS_TABLE_NAME") ?? throw new ArgumentException("SESSIONS_TABLE_NAME");
    public Function()
    {
        _dynamoDbClient = new AmazonDynamoDBClient();
    }

    /// <summary>
    /// A simple function that takes a string and does a ToUpper
    /// </summary>
    /// <param name="input"></param>
    /// <param name="context"></param>
    /// <returns></returns>
    public async Task<APIGatewayProxyResponse> CreateSessionHandler(APIGatewayProxyRequest request, ILambdaContext context)
    {
        var command = JsonSerializer.Deserialize<CreateSessionCommand>(request.Body);

        if (command is null || string.IsNullOrEmpty(command.AdminUsername))
        {
            return new APIGatewayProxyResponse()
            {
                StatusCode = (int)HttpStatusCode.BadRequest,
                Headers = new Dictionary<string, string>
                 {
                     { "Content-Type", "application/json" },
                     {"Access-Control-Allow-Origin", "*"},
                     {"Access-Control-Allow-Methods", "*"},
                 }
            };
        }

        var sessionId = Guid.NewGuid().ToString();

        await _dynamoDbClient.PutItemAsync(TableName,
               new Dictionary<string, AttributeValue>()
               {
                    {"SessionId", new AttributeValue(sessionId)},
                    {"AdminId", new AttributeValue(Guid.NewGuid().ToString())},
                    {nameof(CreateSessionCommand.AdminUsername), new AttributeValue(command.AdminUsername)}
               });

        var response = new CreateSessionResponse(sessionId);
        return new APIGatewayProxyResponse()
        {
            StatusCode = (int)HttpStatusCode.Created,
            Body = JsonSerializer.Serialize(response),
            Headers = new Dictionary<string, string>
                 {
                     { "Content-Type", "application/json" },
                     {"Access-Control-Allow-Origin", "*"},
                     {"Access-Control-Allow-Methods", "*"},
                 }
        };
    }

    record CreateSessionCommand(string AdminUsername);
    record CreateSessionResponse(string SessionId);

    public async Task<APIGatewayProxyResponse> JoinSessionHandler(APIGatewayProxyRequest request, ILambdaContext context)
    {
        var sessionId = request.PathParameters["session"];

        var command = JsonSerializer.Deserialize<JoinSessionCommand>(request.Body);

        if (command is null || string.IsNullOrEmpty(command.Username) || string.IsNullOrEmpty(sessionId))
        {
            return new APIGatewayProxyResponse()
            {
                StatusCode = (int)HttpStatusCode.BadRequest,
                Headers = new Dictionary<string, string>
                 {
                     { "Content-Type", "application/json" },
                     {"Access-Control-Allow-Origin", "*"},
                     {"Access-Control-Allow-Methods", "*"},
                 }
            };
        }

        var session = await GetSession(sessionId);

        if (session is not null)
        {
            if (session.Participants is null)
            {
                session.Participants = new List<string>();
            }
            if (!session.Participants.Contains(command.Username))
            {
                session.Participants.Add(command.Username);
                using var ctx = new DynamoDBContext(_dynamoDbClient);
                await ctx.SaveAsync(session);
            }

            // UpdateItemRequest update = new(
            //     TableName,
            //     new Dictionary<string, AttributeValue>
            //     {
            //         {"SessionId", new AttributeValue(sessionId)}
            //     },
            //     new Dictionary<string, AttributeValueUpdate>
            //     {
            //         {
            //             "Participants",
            //             new AttributeValueUpdate(
            //                 new AttributeValue
            //                 {
            //                     SS = new List<string>{ command.Username }
            //                 },
            //                 AttributeAction.PUT
            //                 )
            //         }
            //     });

            // await _dynamoDbClient.UpdateItemAsync(update);

            return new APIGatewayProxyResponse()
            {
                StatusCode = (int)HttpStatusCode.OK,
                Headers = new Dictionary<string, string>
                 {
                     { "Content-Type", "application/json" },
                     {"Access-Control-Allow-Origin", "*"},
                     {"Access-Control-Allow-Methods", "*"},
                 }
            };
        }

        return new APIGatewayProxyResponse()
        {
            StatusCode = (int)HttpStatusCode.NotFound,
            Headers = new Dictionary<string, string>
                 {
                     { "Content-Type", "application/json" },
                     {"Access-Control-Allow-Origin", "*"},
                     {"Access-Control-Allow-Methods", "*"},
                 }
        };
    }

    private async Task<PlanningSession?> GetSession(string sessionId)
    {
        using var ctx = new DynamoDBContext(_dynamoDbClient);

        var sessions = await ctx.QueryAsync<PlanningSession>(sessionId).GetRemainingAsync();
        

        // var get = new QueryRequest
        // {
        //     TableName = TableName,
        //     KeyConditionExpression = "SessionId = :id",
        //     ExpressionAttributeValues = new Dictionary<string, AttributeValue>
        //     {
        //         {":id", new AttributeValue { S =  sessionId }}
        //     }
        // };

        // var session = await _dynamoDbClient.QueryAsync(get);


        return sessions.FirstOrDefault();
    }

    record JoinSessionCommand(string Username);

    [DynamoDBTable("planning-sessions")]
    public class PlanningSession
    {
        [DynamoDBProperty("SessionId")]
        [DynamoDBHashKey]
        public string SessionId { get; set; }
        [DynamoDBProperty("AdminId")]
        [DynamoDBRangeKey]
        public string AdminId { get; set; }
        [DynamoDBProperty("Participants")]
        public List<string> Participants { get; set; }
    }
}
