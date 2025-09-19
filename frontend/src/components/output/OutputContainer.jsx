


export const OutputContainer = ({
    outputData,
    ...props
}) => {

    return (
        <div className="h-full min-h-0 border-l border-gray-300">
            <div className="p-4 h-full flex flex-col">
                <h2 className="text-lg font-semibold mb-4">Output</h2>
                <div className="flex-grow overflow-auto bg-white p-4 border rounded">
                    <h3 className="text-md font-semibold mb-2">BILN:</h3>
                    <pre className="whitespace-pre-wrap break-words text-sm text-gray-800">
                        {outputData.biln || 'No output available.'}
                    </pre>
                    <hr className="my-4" />
                    <h3 className="text-md font-semibold mb-2">HELM:</h3>
                    <pre className="whitespace-pre-wrap break-words text-sm text-gray-800">
                        {outputData.helm || 'No output available.'}
                    </pre>
                    <hr className="my-4" />
                    <h3 className="text-md font-semibold mb-2">SMILES:</h3>
                    <pre className="whitespace-pre-wrap break-words text-sm text-gray-800">
                        {outputData.smiles || 'No output available.'}
                    </pre>
                    <hr className="my-4" />
                    <h3 className="text-md font-semibold mb-2">3D Structure:</h3>
                    <pre className="whitespace-pre-wrap break-words text-sm text-gray-800">
                        {outputData.structure3D || 'No output available.'}
                    </pre>
                </div>

            </div>
        </div>
    );
};