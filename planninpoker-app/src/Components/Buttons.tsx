interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    text: string;
}


export const Button: React.FC<ButtonProps> = ({ text, ...props }) => {
    return (
        <button
            className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            {...props}
        >
            {text}
        </button>
    );
};

export const SubmitButton = (props: { text: string }) =>
    <button
        className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        type="submit">
        {props.text}
    </button>