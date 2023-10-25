using Amazon.Lambda.APIGatewayEvents;
using System.Net;
using System.Text.Json;

namespace PlanningSessionFunctions;

internal class ApiGatewayResponse
{
    public static APIGatewayProxyResponse OK(object? body = null) => BuildResponse(HttpStatusCode.OK, body);
    public static APIGatewayProxyResponse MethodNotAllowed() => BuildResponse(HttpStatusCode.MethodNotAllowed);
    public static APIGatewayProxyResponse BadRequest() => BuildResponse(HttpStatusCode.BadRequest);
    public static APIGatewayProxyResponse NotFound() => BuildResponse(HttpStatusCode.NotFound);
    public static APIGatewayProxyResponse BuildResponse(HttpStatusCode statusCode, object? body = null) => new()
    {
        StatusCode = (int)statusCode,
        Headers = new Dictionary<string, string>
        {
            { "Content-Type", "application/json" } ,
            {"Access-Control-Allow-Origin", "*"},
            {"Access-Control-Allow-Methods", "*"},
        },
        Body = body is not null ? JsonSerializer.Serialize(body) : null
    };
}
