using Xunit;
using Amazon.Lambda.TestUtilities;
using Amazon.Lambda.APIGatewayEvents;

namespace PlanningSessionFunctions.Tests;

public class FunctionTest
{
    [Fact]
    public async Task AdminUsernameMissing()
    {
        Environment.SetEnvironmentVariable("SESSIONS_TABLE_NAME", "TEST");

        // Invoke the lambda function and confirm the string was upper cased.
        var function = new Function();
        
        var context = new TestLambdaContext();

        var request = new APIGatewayProxyRequest
        {
            Body = "{\"AdminUsername\":\"\"}"
        };

        var response = await function.CreateSessionHandler(request, context);

        Assert.Equal((int)System.Net.HttpStatusCode.BadRequest,response.StatusCode);
    }
}
