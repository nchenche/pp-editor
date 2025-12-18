import React from 'react';
import { Link } from 'react-router-dom';


function NavLink({ to, children, isDisabled, disabledReason, onDisabledClick }) {
    const baseClassName = 'inline-flex items-center leading-none p-2 px-4 rounded-md font-bold';
    const className = isDisabled
        ? `${baseClassName} text-gray-500 opacity-60 cursor-not-allowed bg-transparent border-0 appearance-none`
        : `${baseClassName} text-gray-400 hover:text-gray-200 transition-colors duration-500`;

    return (
        <li>
            {isDisabled ? (
                <button
                    type="button"
                    aria-disabled="true"
                    title={disabledReason || 'Requires Owner ID'}
                    className={className}
                    onClick={() => onDisabledClick?.({ to, reason: disabledReason })}
                >
                    {children}
                </button>
            ) : (
                <Link
                    to={to}
                    className={className}
                >
                    {children}
                </Link>
            )}
        </li>
    );
}

function NavBar({ dataLinks, onDisabledLinkClick }) {
    return (
        <>
            <nav className='text-gray-300 text-sm font-normal mt-4'>
                <ul className='flex justify-center space-x-5'>
                    {
                        dataLinks.map((ele, idx) => {
                            return (
                                <NavLink
                                    key={`nav-${idx}`}
                                    to={ele.to}
                                    isDisabled={Boolean(ele.disabled)}
                                    disabledReason={ele.disabledReason}
                                    onDisabledClick={onDisabledLinkClick}
                                >
                                    {ele.text}
                                </NavLink>
                            );
                        })
                    }
                </ul>
            </nav>
        </>
    );
}

export default NavBar;