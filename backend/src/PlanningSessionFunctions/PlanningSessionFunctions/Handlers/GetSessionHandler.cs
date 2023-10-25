using Amazon.DynamoDBv2.DataModel;
using static PlanningSessionFunctions.Function;

namespace PlanningSessionFunctions.Handlers;

public class GetSessionHandler
{
    private readonly IDynamoDBContext _context;

    public GetSessionHandler(IDynamoDBContext context)
    {
        _context = context;
    }

    public async Task<PlanningSession?> GetSession(string sessionId)
    {
        var sessions = await _context.QueryAsync<PlanningSession>(sessionId).GetRemainingAsync();

        return sessions.FirstOrDefault();
    }
}