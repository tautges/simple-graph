import React, { useState } from 'react';

const NameBox = () => {
    const [name, setName] = useState("");

    return (
        <div>
            <table>
                <tbody>
                    <tr>
                        <td><strong>Name:</strong></td>
                        <td><input type="text" value={name} onChange={(event) => setName(event.target.value)} /></td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

export default NameBox;
