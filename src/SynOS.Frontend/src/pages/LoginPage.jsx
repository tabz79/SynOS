import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2, AlertCircle } from 'lucide-react';

export function LoginPage() {
    const [email, setEmail] = useState('');
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
            const data = await login(email, password);
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
            await login(email, password, branchId);
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
                <div className="w-full max-w-sm bg-zinc-900 border border-synos-border rounded-xl p-8 shadow-2xl">
                    <h2 className="text-xl font-bold text-white mb-6 text-center">Select Branch</h2>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                        {authData.availableBranches.map(branch => (
                            <button
                                key={branch.branchId}
                                onClick={() => handleBranchSelect(branch.branchId)}
                                className="w-full bg-zinc-800 border border-zinc-700 hover:border-synos-primary text-white p-3 rounded text-left transition-all"
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
            <div className="w-full max-w-sm bg-zinc-900 border border-synos-border rounded-xl p-8 shadow-2xl">
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-bold text-white mb-2">SynOS Login</h1>
                    <p className="text-zinc-500 text-sm">Authorized Personnel Only</p>
                </div>

                <form onSubmit={handleInitialSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-200 text-sm p-3 rounded flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-black/50 border border-zinc-700 rounded p-2 text-white focus:outline-none focus:border-synos-primary transition-colors"
                            placeholder="user@synos.lab"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black/50 border border-zinc-700 rounded p-2 text-white focus:outline-none focus:border-synos-primary transition-colors"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-white text-black font-bold py-2.5 rounded hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isSubmitting ? 'Authenticating...' : 'Access Portal'}
                    </button>

                </form>
            </div>
        </div>
    );
}
