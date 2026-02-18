import React from 'react';
import { NavLink as RouterNavLink } from 'react-router-dom';


function NavItemLink({ to, children, isDisabled, disabledReason, onDisabledClick }) {
    const baseClassName = 'inline-flex items-center leading-none py-1.5 px-3 rounded-md font-semibold text-sm whitespace-nowrap';
    const disabledClassName = `${baseClassName} text-gray-500 opacity-60 cursor-not-allowed bg-transparent border-0 appearance-none`;

    const classNameForLink = ({ isActive }) => {
        if (isActive) {
            return `${baseClassName} text-gray-100 bg-slate-700/60 ring-1 ring-slate-500/40`;
        }
        return `${baseClassName} text-gray-400 hover:text-gray-200 hover:bg-slate-800/40 transition-colors duration-100`;
    };

    return (
        <li>
            {isDisabled ? (
                <button
                    type="button"
                    aria-disabled="true"
                    title={disabledReason || 'Requires Session ID'}
                    className={disabledClassName}
                    onClick={() => onDisabledClick?.({ to, reason: disabledReason })}
                >
                    {children}
                </button>
            ) : (
                <RouterNavLink to={to} end={to === '/'} className={classNameForLink}>
                    {children}
                </RouterNavLink>
            )}
        </li>
    );
}

function NavBar({ dataLinks, onDisabledLinkClick }) {
    return (
        <>
            <nav className='text-gray-300 text-sm font-normal'>
                <ul className='flex items-center space-x-1 flex-nowrap'>
                    {
                        dataLinks.map((ele, idx) => {
                            return (
                                <NavItemLink
                                    key={`nav-${idx}`}
                                    to={ele.to}
                                    isDisabled={Boolean(ele.disabled)}
                                    disabledReason={ele.disabledReason}
                                    onDisabledClick={onDisabledLinkClick}
                                >
                                    {ele.text}
                                </NavItemLink>
                            );
                        })
                    }
                </ul>
            </nav>
        </>
    );
}

export default NavBar;