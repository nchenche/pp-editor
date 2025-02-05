export const Toggle = ({ label, checked, onChange }) => {
    return (
        <label className="inline-flex items-center cursor-pointer">
            <input
                type="checkbox"
                className="sr-only peer"
                checked={checked}
                onChange={onChange}
            />
            <div
                className="
                relative w-10 h-4 bg-gray-400 rounded-full 
                dark:bg-gray-700
                peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full
                after:content-[''] after:absolute after:top-[2px] after:left-[2px] peer-checked:after:left-[14px]
                after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all
                peer-checked:bg-blue-500
            "
            />

            <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                {label}
            </span>
        </label>
    );
};
