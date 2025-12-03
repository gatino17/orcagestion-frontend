import React, { useEffect, useState } from 'react';
import { iniciarSesion } from '../controllers/authControllers';
import './Login.css';

const Login = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [rememberMe, setRememberMe] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const STORAGE_KEY = 'orcagest:remember-email';

    useEffect(() => {
        document.body.classList.add('login-page');
        return () => {
            document.body.classList.remove('login-page');
        };
    }, []);

    useEffect(() => {
        const savedEmail = localStorage.getItem(STORAGE_KEY);
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        const credenciales = { email, password };
        try {
            await iniciarSesion(
                credenciales,
                () => {
                    if (rememberMe) {
                        localStorage.setItem(STORAGE_KEY, email);
                    } else {
                        localStorage.removeItem(STORAGE_KEY);
                    }
                    onLoginSuccess();
                },
                (mensajeError) => setError(mensajeError || 'Credenciales inválidas')
            );
        } catch (err) {
            setError('Ocurrió un problema al iniciar sesión. Intenta nuevamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="login-wrapper">
            <div className="login-card">
                <div className="login-info">
                    <h2>Bienvenido a OrcaGest</h2>
                    <p>Gestiona tus operaciones y soporte en una plataforma centralizada, segura y en tiempo real.</p>
                    <ul className="login-highlights">
                        <li>
                            <i className="fas fa-shield-alt"></i>
                            Autenticación segura y roles por perfil.
                        </li>
                        <li>
                            <i className="fas fa-chart-line"></i>
                            Indicadores y reportes al instante.
                        </li>
                        <li>
                            <i className="fas fa-headset"></i>
                            Soporte integral para tu operación diaria.
                        </li>
                    </ul>
                </div>
                <div className="login-form">
                    <div className="login-brand">
                        <i className="fas fa-satellite-dish"></i>
                        <span>OrcaGest</span>
                    </div>
                    <h3>Iniciar sesión</h3>
                    <small>Ingresa tus credenciales para acceder al panel</small>

                    {error && <div className="login-error">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="input-with-icon">
                            <span>
                                <i className="fas fa-envelope"></i>
                            </span>
                            <input
                                type="email"
                                placeholder="Correo electrónico"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="input-with-icon">
                            <span>
                                <i className="fas fa-lock"></i>
                            </span>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            >
                                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            </button>
                        </div>

                        <div className="login-actions">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                />
                                Recordar correo
                            </label>
                            <span>¿Problemas para acceder?</span>
                        </div>

                        <button type="submit" className="login-submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
                        </button>
                    </form>

                    <div className="login-footer mt-3">
                        &copy; {new Date().getFullYear()} OrcaGest. Todos los derechos reservados.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
