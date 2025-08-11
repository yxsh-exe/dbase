"use client";

import { Toaster } from "react-hot-toast";

export function ToasterProvider() {
    return (
        <Toaster
            position="top-right"
            containerStyle={{ zIndex: 9999 }}
            toastOptions={{
                style: {
                    background: "#111827",
                    color: "#F9FAFB",
                    border: "1px solid #FFFFFF",
                    borderRadius: 0,
                },
            }}
        />
    );
}


