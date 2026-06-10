import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2, AlertCircle } from 'lucide-react';

export function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [authData, setAuthData] = useState(null); // Stores intermediate requirements (modes/branches)
    const [selectedMode, setSelectedMode] = useState(null);
    const { login, user } = useAuth();
    const navigate = useNavigate();

    const handleInitialSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const data = await login(username, password);
            if (data.requiresBranchSelection) {
                setAuthData(data);
            } else {
                navigate('/');
            }
        } catch (err) {
            localStorage.removeItem('synos_jwt'); // Clear stale session
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBranchSelect = async (branchId) => {
        setIsSubmitting(true);
        try {
            await login(username, password, branchId);
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (user) {
        setTimeout(() => navigate('/'), 100);
    }

    // Render Branch Selection
    if (authData?.requiresBranchSelection) {
        return (
            <div className="h-screen w-screen bg-synos-background flex items-center justify-center p-4">
                <div className="w-full max-w-sm bg-white border border-zinc-200/80 rounded-2xl p-8 shadow-xl">
                    <h2 className="text-xl font-bold text-zinc-900 mb-6 text-center">Select Branch</h2>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                        {authData.availableBranches.map(branch => (
                            <button
                                key={branch.branchId}
                                onClick={() => handleBranchSelect(branch.branchId)}
                                className="w-full bg-zinc-50 border border-zinc-200 hover:border-synos-primary hover:bg-zinc-100/50 text-zinc-900 p-3 rounded-xl text-left transition-all font-medium"
                            >
                                {branch.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen bg-synos-background flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white border border-zinc-200/80 rounded-2xl p-8 shadow-xl">
                <div className="mb-6 flex flex-col items-center justify-center text-center">
                    <img 
                        src="/assets/synos-lockup.svg" 
                        alt="SynOS Logo" 
                        className="h-8 object-contain mb-4" 
                    />
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Authorized Personnel Only</p>
                </div>

                <form onSubmit={handleInitialSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Username</label>
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-zinc-900 focus:outline-none focus:border-synos-primary transition-colors"
                            placeholder="username"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-zinc-900 focus:outline-none focus:border-synos-primary transition-colors"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-synos-primary hover:bg-synos-primary/90 text-white font-bold py-2.5 rounded transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isSubmitting ? 'Authenticating...' : 'Access Portal'}
                    </button>

                </form>
            </div>
        </div>
    );
}
