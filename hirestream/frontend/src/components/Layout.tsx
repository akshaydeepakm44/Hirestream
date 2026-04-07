import { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { motion, AnimatePresence } from 'framer-motion';

export const Layout = ({ children }: { children: ReactNode }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div className="min-h-screen flex bg-slate-50/50">
            <Sidebar 
                isCollapsed={isCollapsed} 
                toggleSidebar={() => setIsCollapsed(!isCollapsed)} 
            />

            <div className="flex-1 flex flex-col min-w-0">
                <Header />
                
                <main className="flex-1 p-8 overflow-y-auto">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={window.location.pathname}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
};
