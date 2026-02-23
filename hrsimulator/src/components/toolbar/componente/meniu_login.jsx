import {Link} from 'react-router-dom';
import { useContext } from 'react';

import LoginContext from '../../../context/login_context';

export default function MeniuLogin() {
     
    const {user, onLogout} = useContext(LoginContext)

    return (
        <div className="articolMeniu">
            {user.isAuthenticated ? 
                <Link to="/" onClick={(event => {
                    //event.preventDefault();
                    onLogout();
                })}>LogOut</Link>: 
                <Link to="/login">Login</Link>
            }
        </div>
    )
            
}