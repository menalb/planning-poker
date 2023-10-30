import { APIGatewayEventRequestContext, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as aws from "aws-sdk";
import { ApiGatewayManagementApi } from 'aws-sdk';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

const docClient = new aws.DynamoDB.DocumentClient();
const ConnectionTableName = process.env.TABLE_NAME!;

interface ConnectedUserInfo {
    userId: string,
    username: string,
    connectionId: string
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {

    if (!event.requestContext.connectionId) {
        return { statusCode: 400, body: "Disconnection failed. Bad Request" };
    }

    try {
        let connectedUsers = await getConnectedUsers();

        await removeConnection(event.requestContext.connectionId);

        if (connectedUsers) {
            const userLeft = connectedUsers.find((u: any) => u.connectionId === event.requestContext.connectionId);

            if (userLeft) {
                await notifyNewConnectedUser(userLeft, connectedUsers, buildApiGWManagementApi(event.requestContext));
            }
        }
        return { statusCode: 200, body: 'Disconnected.' };
    } catch (e: any) {
        console.log(e);
        return { statusCode: 500, body: e.stack };
    }
};

const removeConnection = async (connectionId: string) => {
    const deleteParams = {
        TableName: ConnectionTableName,
        Key: {
            connectionId: connectionId
        }
    };

    await docClient.delete(deleteParams).promise();
}

const getConnectedUsers = async () => {

    const result = await docClient.scan({ TableName: ConnectionTableName, ProjectionExpression: 'connectionId,username' }).promise();

    return result.Items as ConnectedUserInfo[];
}

const buildApiGWManagementApi = (requestContext: APIGatewayEventRequestContext) =>
    new ApiGatewayManagementApi({
        apiVersion: '2018-11-29',
        endpoint: requestContext.domainName + '/' + requestContext.stage
    });

const notifyNewConnectedUser = async (userInfo: ConnectedUserInfo, users: ConnectedUserInfo[], notifier: ApiGatewayManagementApi) => {

    const postData = JSON.stringify({
        action: 'player-disconnected',
        user: { username: userInfo.username }
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