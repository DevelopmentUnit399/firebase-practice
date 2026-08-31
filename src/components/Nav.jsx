// src/components/Nav.jsx
import React, { useState, useEffect } from 'react';
import {
  getMultiFactorResolver,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier,
  sendPasswordResetEmail
} from 'firebase/auth'
import { auth } from '../firebase/init'
import { useNavigate } from 'react-router-dom';
import googleIcon from '../assets/google-signin.png'
import facebookIcon from '../assets/facebook-signin.png'

const Nav = ({ 
  loading, 
  login, 
  logout, 
  register, 
  loginWithGoogle,
  loginWithFacebook,
  user, 
  authModalType, 
  openAuthModal, 
  closeAuthModal 
}) => {
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [resetSentMsg, setResetSentMsg] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const navigate = useNavigate();

  const [mfaResolver, setMfaResolver] = useState(null);
  const [mfaVerificationId, setMfaVerificationId] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaSending, setMfaSending] = useState(false);

  // Trigger MFA Flow Helper
  const triggerMfaFlow = async (error) => {
    const resolver = getMultiFactorResolver(auth, error)
    setMfaResolver(resolver)
    setMfaSending(true)

    try {
      if (window.loginRecaptchaVerifier) {
        try {
          window.loginRecaptchaVerifier.clear()
        } catch (e) {}
        window.loginRecaptchaVerifier = null
      }

      window.loginRecaptchaVerifier = new RecaptchaVerifier(
        'mfa-login-recaptcha-container',
        {
          size: 'invisible',
          callbvack: () => {}
        },
        auth
      )

      await window.loginRecaptchaVerifier.render()

      const phoneInfoOptions = {
        multiFactorHint: resolver.hints[0],
        session: resolver.session
      }

      const phoneAuthProvider = new PhoneAuthProvider(auth)
      const verId = await phoneAuthProvider.verifyPhoneNumber(
        phoneInfoOptions,
        window.loginRecaptchaVerifier
      )

      setMfaVerificationId(verId)
    } catch (smsError) {
      setAuthError('Failed to dispatch 2FA SMS code. Please try again.')
    } finally {
      setMfaSending(false)
    }
  }

  const handleAuthSubmit = async (e) => {
    e.preventDefault()
    setAuthError('')

    try {
      if (authModalType === 'login') {
          await login(email, password)
      } else {
          await register(email, password)
      }
      handleCloseAuth()
    } catch (error) {
        if (error.code === 'auth/multi-factor-auth-required') {
            await triggerMfaFlow(error)
        } else if (
            error.code === 'auth/invalid-login-credentials' ||
            error.code === 'auth/invalid-credential' ||
            error.code === 'auth/wrong-password' ||
            error.code === 'auth/user-not-found'
        ) {
            setAuthError('Invalid email or password.')
        } else if (error.code === 'auth/invalid-email') {
            setAuthError('Please provide a valid email address.')
        } else if (error.code === 'auth/email-already-in-use') {
            setAuthError('An account with this email already exists.')
        } else if (error.code === 'auth/weak-password') {
            setAuthError('Password must be at least 6 characters.')
        } else if (error.code === 'auth/too-many-requests') {
            setAuthError('Too many failed attempts. Please try again later.')
        } else {
            setAuthError(error.message)
        }
    }
  }

  // Handle sending password reset email
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault()
    setAuthError('')
    setResetSentMsg('')

    if (!email.trim()) {
      setAuthError('Please enter your account email.')
      return
    }

    try {
      await sendPasswordResetEmail(auth, email)
      setResetSentMsg('Password reset link sent! Check your inbox.')
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        setAuthError('No account found with this email.')
      } else if (error.code === 'auth/invalie-email') {
        setAuthError('Please enter a valid email address.')
      } else {
        setAuthError(error.message)
      }
    }
  }

  const handleMfaChallengeSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (!mfaCode.trim()) {
      setAuthError('Please enter the 6-digit SMS code.');
      return;
    }

    try {
      const cred = PhoneAuthProvider.credential(mfaVerificationId, mfaCode);
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);

      // Resolves the original sign-in attempt
      await mfaResolver.resolveSignIn(multiFactorAssertion);

      // Reset MFA challenge state & close modal
      setMfaResolver(null);
      setMfaVerificationId(null);
      setMfaCode('');
      handleCloseAuth();
    } catch (error) {
      if (error.code === 'auth/invalid-verification-code') {
        setAuthError('Invalid 6-digit verification code.');
      } else {
        setAuthError(error.message);
      }
    }
  };

  const handleCloseAuthWithMfa = () => {
    if (window.loginRecaptchaVerifier) {
      try {
        window.loginRecaptchaVerifier.clear();
      } catch (e) {}
      window.loginRecaptchaVerifier = null;
    }
    setMfaResolver(null);
    setMfaVerificationId(null);
    setMfaCode('');
    handleCloseAuth();
  };

  useEffect(() => {
    if (!authModalType) {
      setAuthError('');
      setEmail('');
      setPassword('');
      setMfaResolver(null);
      setMfaVerificationId(null);
      setMfaCode('');
    }
  }, [authModalType]);

  const handleLogout = () => {
    logout();
    setShowAccountModal(false);
  };

  const handleNavigateToAccount = () => {
    setShowAccountModal(false);
    navigate('/account');
  };

  const handleCloseAuth = () => {
    setAuthError('');
    setEmail('');
    setPassword('');
    closeAuthModal();
  };

  const handleGoogleAuth = async () => {
    setAuthError('')
    try {
      await loginWithGoogle()
      handleCloseAuth()
    } catch (error) {
      if (error.code === 'auth/multi-factor-auth-required') {
        await triggerMfaFlow(error)
      } else if (error.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in Cancelled.')
      } else {
        setAuthError(error.message)
      }
    }
  };

  const handleFacebookAuth = async () => {
    setAuthError('');
    try {
      await loginWithFacebook()
      handleCloseAuth()
    } catch (error) {
      if (error.code === 'auth/multi-factor-auth-required') {
        await triggerMfaFlow(error)
      } else if (error.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in cancelled.')
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        setAuthError('An account already exists with the same email using a different sign-in method.')
      } else {
        setAuthError(error.message)
      }
    }
  };

  return (
    <section id="nav">
      <div className="row">
        <div className="nav__bar">
          <figure className="nav__bar--frame">
            <h2 className="nav__bar--img">Firebase Test</h2>
          </figure>

          {loading ? (
            <div className="nav__bar--loading">
              <div className="nav__bar__loading--btn skeleton"></div>
              <div className="nav__bar__loading--btn skeleton"></div>
            </div>
          ) : user?.email ? (
            <div className="nav__bar--account" onClick={() => setShowAccountModal(true)}>
              <div className="nav__bar--account-background">
                <p className="nav__bar--icon btn">
                  {user.email[0].toUpperCase()}
                </p>
              </div>
            </div>
          ) : (
            <div className="nav__bar--no-account">
              <button className="nav__bar--login btn" onClick={() => openAuthModal('login')}>
                Login
              </button>
              <button className="nav__bar--register btn" onClick={() => openAuthModal('register')}>
                Register
              </button>
            </div>
          )}
        </div>
      </div>

      {/* AUTH MODAL (LOGIN / REGISTER/ FORGOT PASSWORD / MFA CHALLENGE) */}
      {authModalType && (
        <div className="modal__backdrop" onClick={handleCloseAuthWithMfa}>
          <div className="modal__box" onClick={(e) => e.stopPropagation()}>
            <div id="mfa-login-recaptcha-container"></div>

            {mfaResolver ? (
              /* MFA Challenge Form */
              <form onSubmit={handleMfaChallengeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h2>Two-Factor Verification</h2>
                <p style={{ color: '#666', fontSize: '15px' }}>
                  {mfaSending
                    ? 'Sending security code...'
                    : `Enter the 6-digit code sent to ${mfaResolver.hints[0]?.phoneNumber || 'your registered phone'}.`}
                </p>

                {authError && <p className="auth__error--text">{authError}</p>}

                <p className="input__title--text">SMS Security Code</p>
                <input
                  type="text"
                  placeholder="6-digit code"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  autoFocus
                  required
                />

                <div className="modal__actions">
                  <button type="button" className="btn__cancel" onClick={handleCloseAuthWithMfa}>
                    Cancel
                  </button>
                  <button type="submit" className="btn" disabled={mfaSending}>
                    Verify & Log In
                  </button>
                </div>
              </form>
            ) : isForgotPassword ? (
              /* Forgot Password Form */
              <div>
                <h2>Reset Password</h2>
                <p style={{ color: '#666', fontSize: '15px', marginBottom: '12px' }}>
                  Enter your email address to receive a secure password reset link.
                </p>

                {authError && <p className="auth__error--text">{authError}</p>}
                {resetSentMsg && <p className="auth__success--text">{resetSentMsg}</p>}

                <form onSubmit={handleForgotPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p className="input__title--text">Email</p>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                  <div className="modal__actions">
                    <button
                      type="button"
                      className="btn__cancel"
                      onClick={() => {
                        setIsForgotPassword(false)
                        setAuthError('')
                        setResetSentMsg('')
                      }}
                    >
                      Back to Login
                    </button>
                    <button type="submit" className="btn">
                      Send Reset Link
                    </button>
                  </div>
                </form>
              </div>
              ) : (
              /* Standard Email/Password Login & Register Form */
              <div>
                <h2>{authModalType === 'login' ? 'Login' : 'Create an Account'}</h2>

                {authError && (
                  <p className="auth__error--text">
                    {authError}
                  </p>
                )}

                <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p className="input__title--text">Email</p>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p className="input__title--text">Password</p>
                    {authModalType === 'login' && (
                      <span
                        className="auth__forgot-password--link"
                        onClick={() => {
                          setIsForgotPassword(true)
                          setAuthError('')
                        }}
                      >
                        Forgot Password?
                      </span>
                    )}
                  </div>
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />

                  <button
                    type="button"
                    className="btn__google--image-only"
                    onClick={handleGoogleAuth}
                  >
                    <img
                      src={googleIcon}
                      alt="Sign In With Google"
                      className="google__icon"
                    />
                  </button>
                  <button
                    type="button"
                    className="btn__google--image-only"
                    onClick={handleFacebookAuth}
                  >
                    <img
                      src={facebookIcon}
                      alt="Sign In With Facebook"
                      className="google__icon"
                    />
                  </button>

                  <div className="modal__actions">
                    <button 
                      type="button" 
                      className="btn__cancel" 
                      onClick={handleCloseAuth}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn">
                      {authModalType === 'login' ? 'Login' : 'Register'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ACCOUNT OPTIONS MODAL */}
      {showAccountModal && (
        <div className="modal__backdrop" onClick={() => setShowAccountModal(false)}>
          <div className="modal__box" onClick={(e) => e.stopPropagation()}>
            <h2>Account Settings</h2>
            <p style={{ textAlign: 'center', marginBottom: '16px' }}>
              Signed in as <strong>{user?.email}</strong>
            </p>

            <div className="account__modal--buttons" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button className="btn" onClick={handleNavigateToAccount}>
                Account Info
              </button>
              <button 
                className="btn"
                style={{ backgroundColor: '#e74c3c' }}
                onClick={handleLogout}
              >
                Logout
              </button>
              <button className="btn__cancel" onClick={() => setShowAccountModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Nav;