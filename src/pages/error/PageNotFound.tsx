import { useNavigate } from "react-router-dom";
import { RoundedButton } from "src/shared";

export const PageNotFound = () => {
    const navigate = useNavigate();
    return (
        <div className='grid h-svh w-full items-center justify-center'>
            <div>
                <h1 className="mb-5 text-xl">Página no encontrada :(</h1>
                <RoundedButton className="bg-zinc-900 text-white w-full" onClick={() => navigate('/')}>Volver al sitio</RoundedButton>
            </div>
        </div>
    );
}