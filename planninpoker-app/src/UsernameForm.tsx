import { useState } from "react";
import { SubmitButton } from "./Components/Buttons";

export const UsernameForm: React.FC<{ onSubmit: (username: string) => void }> =
    ({ onSubmit }) => {

        const [username, setUsername] = useState('');

        const submit = (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            onSubmit(username);
        }

        return (
            <form className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4" onSubmit={async (e) => await submit(e)}>
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                        Enter your username:
                    </label>
                    <input
                        id="username"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </div>
                <div className="flex items-center justify-between">
                    <SubmitButton text='Enter' />
                </div>
            </form>
        );
    }