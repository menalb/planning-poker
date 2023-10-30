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

    const parseResult = tryParseEvent(event);

    if (!parseResult) {
        return { statusCode: 400, body: "Connection failed. Bad Request" };
    }

    const userinfo: ConnectedUserInfo = parseResult;

    try {
        persistConnection(userinfo);

        await notifyNewConnectedUser(userinfo, buildApiGWManagementApi(event.requestContext));

        return {
            statusCode: 200,
            body: 'Connected'
        };
    } catch (e: any) {
        console.log(e);
        return { statusCode: 500, body: e.stack };
    }
};

const tryParseEvent = (event: APIGatewayProxyEvent): ConnectedUserInfo | false => {
    if (event.requestContext.connectionId &&
        event.queryStringParameters &&
        event.queryStringParameters.userId &&
        event.queryStringParameters.username) {
        return {
            userId: event.queryStringParameters.userId,
            username: event.queryStringParameters.username,
            connectionId: event.requestContext.connectionId
        };
    }
    return false;
}

const persistConnection = async (userInfo: ConnectedUserInfo) => {

    const putParams = {
        TableName: ConnectionTableName,
        Item: {
            connectionId: userInfo.connectionId,
            userId: userInfo.userId,
            username: userInfo.username,
        }
    };

    await docClient
        .put(putParams)
        .promise();
}

const buildApiGWManagementApi = (requestContext: APIGatewayEventRequestContext) =>
    new ApiGatewayManagementApi({
        apiVersion: '2018-11-29',
        endpoint: requestContext.domainName + '/' + requestContext.stage
    });

const notifyNewConnectedUser = async (userInfo: ConnectedUserInfo, notifier: ApiGatewayManagementApi) => {

    const scanParams = {
        TableName: ConnectionTableName,
        ProjectionExpression: 'connectionId,username'
    };

    const connectionData = await docClient.scan(scanParams).promise();

    if (!connectionData.Items) {
        return;
    }

    const message = JSON.stringify({
        action: 'player-connected',
        user: { username: userInfo.username}
    });

    const postCalls = connectionData.Items.map(async (item: any) => {
        const connectionId = item.connectionId
        try {
            if (connectionId !== userInfo.connectionId) {
                await notifier.postToConnection({ ConnectionId: connectionId, Data: message }).promise();
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

    try {
        await Promise.all(postCalls);
    } catch (e: any) {
        console.log(e);
    }
}
