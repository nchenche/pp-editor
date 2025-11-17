import React from 'react';

function Header( {children} ) {
  return (
    <>
      <header className="bg-slate-800 p-4 min-h-28">
        <h1 className="text-white text-2xl text-center">PEP-EDIT</h1>
        {children}
      </header>
    </>
  );
}

export default Header;