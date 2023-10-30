import { useCallback, useEffect, useState } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { SubmitButton } from '../Components/Buttons';
import { Session } from './model';

const WS_URL = import.meta.env.VITE_WS;

const ChatComponent: React.FC<{ session: Session, onClose: () => void }> =
    ({ session, onClose }) => {

        const [socketUrl, setSocketUrl] = useState(WS_URL + '?userId=123&username=' + session.Username);
        const [messageHistory, setMessageHistory] = useState([] as MessageEvent<any>[]);
        const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl, {
            //onClose: (e) => onClose()
            onOpen: () => console.log('open'),
            shouldReconnect: (closedEvent: CloseEvent) => true,
            onClose: (e: CloseEvent) => onClose()
        });

        const [message, setMessage] = useState('');

        useEffect(() => {
            if (lastMessage !== null) {
                setMessageHistory((prev) => prev.concat(lastMessage));
            }
        }, [lastMessage, setMessageHistory]);

        // const handleClickSendMessage = useCallback(() => sendMessage('{"action":"actionmessage","data":"hello"}'), []);

        const connectionStatus = {
            [ReadyState.CONNECTING]: 'Connecting',
            [ReadyState.OPEN]: 'Open',
            [ReadyState.CLOSING]: 'Closing',
            [ReadyState.CLOSED]: 'Closed',
            [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
        }[readyState];

        const send = (e: React.FormEvent<HTMLFormElement>) => {
            const mex: any = { action: "actionmessage", data: message };
            sendMessage(JSON.stringify(mex));
            e.preventDefault();
        }

        return <>
            <div className="max-w-sm rounded overflow-hidden shadow-lg p-2">
                <div>
                    <form className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4" onSubmit={send}>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="message">
                                Message
                            </label>
                            <input
                                id="message"
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <SubmitButton text='Send' />
                        </div>
                    </form>
                </div>
                <p>The WebSocket is currently <b>{connectionStatus}</b></p>
                {lastMessage ? <i>Last message: {lastMessage.data}</i> : null}
                <ul className='list-disc'>
                    {messageHistory.map((message, idx) => (
                        <li key={idx}>{message ? message.data : null}</li>
                    ))}
                </ul>

                <h2>Participants</h2>
                <ul className='list-disc'>
                    {session.Participants.map((p, idx) => (
                        <li key={idx}>{p}</li>
                    ))}

                </ul>
            </div>
        </>
    }

export default ChatComponent;