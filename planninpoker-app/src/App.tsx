import './App.css'
import { useState } from 'react';
import ChatComponent from './Session/Chat';
import { UsernameForm } from './UsernameForm';
import { joinSession } from './Session/SessionApi';
import { Session } from './Session/model';


function App() {

  const [session, setSession] = useState({} as Session);
  const [shouldConnect, setShouldConnect] = useState(false);

  const onUsernameFormSubmit = async (username: string) => {    
    const session = await joinSession(username);
    setSession(session);

    setShouldConnect(true);
  }

  return (
    <div className="bg-orange-300">
      <header className="p-6 bg-black text-orange-500 text-lg mb-2">
        Planning Poker
      </header>
      <main className="flex justify-center">
        {!shouldConnect &&
          <div className="w-full max-w-xs">
            <UsernameForm onSubmit={onUsernameFormSubmit} />
          </div>
        }
        {shouldConnect && session &&
          <div>
            <ChatComponent session={session} onClose={() => setShouldConnect(false)} />
          </div>
        }
      </main>
    </div>
  );
}

export default App
