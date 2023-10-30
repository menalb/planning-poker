import { APIGatewayEventRequestContext, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as aws from "aws-sdk";
import { ApiGatewayManagementApi } from 'aws-sdk';


const docClient = new aws.DynamoDB.DocumentClient();
const ConnectionTableName = process.env.TABLE_NAME!;

interface ConnectedUserInfo {
    userId: string,
    username: string,
    connectionId: string
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log(event.body);
    
    if (!event.requestContext.connectionId || !event.body) {
        return { statusCode: 400, body: "Action Message failed. Bad Request" };
    }

    try {
        const userInfo = await getUserInfo(event.requestContext.connectionId);

        const connectedUsers = await getConnectedUsers();

        const message = JSON.parse(event.body).data;

        await notifyNewConnectedUser(userInfo, message, connectedUsers, buildApiGWManagementApi(event.requestContext));

        return { statusCode: 200, body: 'Data sent.' };
    } catch (e) {
        console.log(e);
        return { statusCode: 500, body: 'FAILED!' };
    }
};

const buildApiGWManagementApi = (requestContext: APIGatewayEventRequestContext) =>
    new ApiGatewayManagementApi({
        apiVersion: '2018-11-29',
        endpoint: requestContext.domainName + '/' + requestContext.stage
    });

const getUserInfo = async (connectionId: string): Promise<ConnectedUserInfo> => {
    var params = {
        TableName: ConnectionTableName,
        Key: {
            'connectionId': connectionId
        }
    };

    const data = await docClient.get(params).promise();

    return {
        userId: data.Item.userId,
        username: data.Item.username,
        connectionId: connectionId
    }
}

const getConnectedUsers = async () => {

    // TODO: move to query when added a group
    const result = await docClient.scan({ TableName: ConnectionTableName, ProjectionExpression: 'username,connectionId' }).promise();

    return result.Items as ConnectedUserInfo[];
}

const notifyNewConnectedUser = async (userInfo: ConnectedUserInfo, message: any, users: ConnectedUserInfo[], notifier: ApiGatewayManagementApi) => {

    const postData = JSON.stringify({
        username: userInfo.username,
        message: message
    });

    const postCalls = users.map(async (item: any) => {
        const connectionId = item.connectionId;
        try {
            if (connectionId !== userInfo.connectionId) {
                await notifier.postToConnection({ ConnectionId: connectionId, Data: postData }).promise();
            }
        } catch (e: any) {
            if (e.statusCode === 410) {
                console.log(`Found stale connection, deleting ${connectionId}`);
                await docClient.delete({ TableName: ConnectionTableName, Key: { connectionId } }).promise();
            } else {
                throw e;
            }
        }
    });
    await Promise.all(postCalls);
}