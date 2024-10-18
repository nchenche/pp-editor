import React from 'react';
import { Link } from 'react-router-dom';



function NavLink({ to, children }) {
    return (
        <li>
            <Link
                to={to}
                className="
                    p-2 px-4 rounded-md
                    font-bold text-gray-400
                    hover:text-gray-200
                    transition-colors duration-500
                "
            >
                {children}
            </Link>
        </li>
    );
}


function NavBar( {dataLinks} ) {
    return (
        <>
            <nav className='text-gray-300 text-sm font-normal mt-4'>
                <ul className='flex justify-center space-x-5'>
                    {
                        dataLinks.map((ele, idx) => {
                            return <NavLink key={`nav-${idx}`} to={ele.to} >{ele.text}</NavLink>
                        })
                    }
                </ul>
            </nav>
        </>
    );
}

export default NavBar;