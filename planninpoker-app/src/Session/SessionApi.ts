import { Session } from "./model";

export const joinSession = async (username: string) : Promise<Session> =>  {
    const API_URL = import.meta.env.VITE_API;
    // const res = await fetch(
    //     `${API_URL}/sessions/34ddd416-bd23-4b4f-86b6-64987f840230/join`,
    //     {
    //         method: 'POST',
    //         headers: { 'Content-Type': 'application/json' },
    //         body: JSON.stringify({ Username: username })
    //     }
    // );
    // console.log(res);

    return {
        Username : username,
        Id: "34ddd416-bd23-4b4f-86b6-64987f840230",
        Participants: [
            "4444",
            "Carlo",
            "Gianni",
            "Mario",
            "Mario2",
            "Pippo",
            "Toni",
            "gigi",
            "Marcello"
        ]
    };
}
