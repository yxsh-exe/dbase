"use client";
import { SignUp } from '@clerk/nextjs';
export default function Page() {
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
            <SignUp
                routing="hash"
                appearance={{
                    elements: {
                        userButtonAvatarBox: "size-8"
                    }
                }}
            />
        </div>
    );
}


