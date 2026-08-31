// src/pages/Account.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    multiFactor,
    PhoneAuthProvider,
    PhoneMultiFactorGenerator,
    RecaptchaVerifier,
    sendEmailVerification
} from 'firebase/auth'
import { auth } from '../firebase/init'
import emailIcon from '../assets/email-icon.png'
import googleIcon from '../assets/google-icon.png'
import facebookIcon from '../assets/facebook-icon.png'

const Account = ({ user, loading }) => {
    const navigate = useNavigate()
    const [showMfaModal, setShowMfaModal] = useState(false)
    const [phoneNumber, setPhoneNumber] = useState('')
    const [verificationCode, setVerificationCode] = useState('')
    const [verificationId, setVerificationId] = useState(null)
    const [statusMessage, setStatusMessage] = useState('')
    const [emailStatusMsg, setEmailStatusMsg] = useState('')
    const [isMfaEnrolled, setIsMfaEnrolled] = useState(false)

    useEffect(() => {
        document.title = 'Account - Firebase Test'
    }, [])

    // Function to check enrolled factors directly from currentUser
    const checkMfaStatus = () => {
        if (auth.currentUser) {
            const factors = multiFactor(auth.currentUser).enrolledFactors || []
            setIsMfaEnrolled(factors.length > 0)
        } else {
            setIsMfaEnrolled(false)
        }
    }

    // Sync on mount and whenever user changes
    useEffect(() => {
        checkMfaStatus()
    }, [user])

    // Map provider IDs to image icons and readable labels
    const getProviderIcons = () => {
        if (!user?.providerData || user.providerData.length === 0) {
            return [{ id: 'password', name: 'Email / Password', icon: emailIcon }]
        }

        return user.providerData.map(p => {
            if (p.providerId === 'google.com') {
                return { id: 'google.com', name: 'Google', icon: googleIcon }
            }
            if (p.providerId === 'facebook.com') {
                return { id: 'facebook.com', name: 'Facebook', icon: facebookIcon }
            }
            if (p.providerId === 'password') {
                return { id: 'password', name: 'Email / Password', icon: emailIcon }
            }
            return { id: p.providerId, name: p.providerId, icon: null }
        })
    }

    const handleSendEmailVerification = async () => {
        setEmailStatusMsg('')
        try {
            await sendEmailVerification(auth.currentUser)
            setEmailStatusMsg('Verification email sent! Check your inbox.')
        } catch (error) {
            setEmailStatusMsg(error.message)
        }
    }

    const handleOpenMfaModal = () => {
        setStatusMessage('')
        setVerificationId(null)
        setVerificationCode('')
        setPhoneNumber('')
        setShowMfaModal(true)
    }

    const handleCloseMfaModal = () => {
        if (window.recaptchaVerifier) {
            try {
                window.recaptchaVerifier.clear()
            } catch (e) {}
            window.recaptchaVerifier = null
        }
        setShowMfaModal(false)
        setStatusMessage('')
        setVerificationId(null)
        setVerificationCode('')
        setPhoneNumber('')
    }

    const handleDisableMfa = async () => {
        setStatusMessage('')
        try {
            const enrolled = multiFactor(auth.currentUser).enrolledFactors
            if (enrolled.length === 0) return

            // Unenroll the first enrolled second factor (SMS)
            await multiFactor(auth.currentUser).unenroll(enrolled[0])
            checkMfaStatus()
            setStatusMessage('Two-factor authentication has been disabled.')
        } catch (error) {
            if (error.code === 'auth/requires-recent-login') {
                setStatusMessage('For security, please log out and log back in before disabling 2FA.')
            } else {
                setStatusMessage(error.message)
            }
        }
    }

    // Step 1: Send SMS code
    const handleSendEnrollmentCode = async () => {
        setStatusMessage('')
        if (!phoneNumber.trim()) {
            setStatusMessage('Please enter a valid phone number.')
            return
        }

        try {
            if (window.recaptchaVerifier) {
                try {
                    window.recaptchaVerifier.clear()
                } catch (e) {}
                window.recaptchaVerifier = null
            }

            window.recaptchaVerifier = new RecaptchaVerifier(
                'mfa-enroll-recaptcha-container',
                {
                    size: 'invisible',
                    callback: () => {}
                },
                auth
            )

            await window.recaptchaVerifier.render()

            const session = await multiFactor(auth.currentUser).getSession()

            const digitsOnly = phoneNumber.replace(/\D/g, '')
            const formattedPhone = digitsOnly.startsWith('1')
                ? `+${digitsOnly}`
                : `+1${digitsOnly}`

            const phoneInfoOptions = {
                phoneNumber: formattedPhone,
                session: session
            }
            const phoneAuthProvider = new PhoneAuthProvider(auth)
            const verId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, window.recaptchaVerifier)

            setVerificationId(verId)
            setStatusMessage('Verification code sent via SMS.')
        } catch (error) {
            if (window.recaptchaVerifier) {
                try {
                    window.recaptchaVerifier.clear()
                } catch (e) {}
                window.recaptchaVerifier = null
            }

            if (error.code === 'auth/requires-recent-login') {
                setStatusMessage('For security, please log out and log back in before enabling 2FA.')
            } else if (error.code === 'auth/operation-not-allowed') {
                setStatusMessage('SMS delivery is disabled for this region in your Firebase Console.')
            } else {
                setStatusMessage(error.message)
            }
        }
    }

    // Step 2: Confirm verification code
    const handleVerifyEnrollmentCode = async () => {
        setStatusMessage('')
        if (!verificationCode.trim()) {
            setStatusMessage('Please enter the 6-digit code.')
            return
        }

        try {
            const cred = PhoneAuthProvider.credential(verificationId, verificationCode)
            const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred)
            await multiFactor(auth.currentUser).enroll(multiFactorAssertion, 'Personal Phone')

            checkMfaStatus()
            setStatusMessage('SMS MFA successfully enrolled!')
            setTimeout(() => {
                handleCloseMfaModal()
            }, 1500)
        } catch (error) {
            setStatusMessage(error.message)
        }
    }

    if (!loading && !user?.uid) {
        return (
            <div className="row" style={{ textAlign: 'center', marginTop: '40px' }}>
                <h2>Please log in to view account settings.</h2>
                <button className="btn" onClick={() => navigate('/')}>Go Home</button>
            </div>
        )
    }

    return (
        <div>
            <div className="row">
                <button className="btn btn__account" onClick={() => navigate('/')}>
                    Go Back
                </button>

                <div className="account__card">
                    <h2>Account Overview</h2>

                    {/* Email Address Section */}
                    <div className="account__section">
                        <p className="input__title--text">Email Address</p>
                        {loading ? (
                            <div className="skeleton skeleton__email"></div>
                        ) : (
                            <div className="account__data">{user?.email}</div>
                        )}
                    </div>

                    {/* Sign-in Provider(s) Section */}
                    <div className="account__section">
                        <p className="input__title--text">Sign-in Provider(s)</p>
                        {loading ? (
                            <div className="skeleton skeleton__icon-box"></div>
                        ) : (
                            <div className="provider__badges">
                                {getProviderIcons().map((provider, index) => (
                                    <div key={index} className="badge badge__provider-icon" title={provider.name}>
                                        {provider.icon ? (
                                            <img
                                                src={provider.icon}
                                                alt={provider.name}
                                                className="provider__img--icon"
                                            />
                                        ) : (
                                            <span>{provider.name}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Email Verification Section */}
                    <div className="account__section">
                        <p className="input__title--text">Email Verification</p>
                        {loading ? (
                            <div className="skeleton skeleton__badge"></div>
                        ) : (
                            <div className="account__status-row">
                                <span className={`badge ${user?.emailVerified ? 'badge__success' : 'badge__warning'}`}>
                                    {user?.emailVerified ? 'Verified' : 'Unverified'}
                                </span>
                                {!user?.emailVerified && (
                                    <button className="btn btn__small" onClick={handleSendEmailVerification}>
                                        Resend Link
                                    </button>
                                )}
                            </div>
                        )}
                        {emailStatusMsg && (
                            <p style={{ marginTop: '8px', color: emailStatusMsg.includes('sent') ? '#2ecc71' : '#e74c3c' }}>
                                {emailStatusMsg}
                            </p>
                        )}
                    </div>

                    {/* Two-Factor Authentication Section */}
                    <div className="account__section">
                        <p className="input__title--text">Two-Factor Authentication (SMS)</p>
                        {loading ? (
                            <div className="skeleton skeleton__row"></div>
                        ) : (
                            <div className="account__status-row">
                                <span className={`badge ${isMfaEnrolled ? 'badge__success' : 'badge__neutral'}`}>
                                    {isMfaEnrolled ? 'Active' : 'Disabled'}
                                </span>

                                {isMfaEnrolled ? (
                                    <button className="btn btn__small btn__danger" onClick={handleDisableMfa}>
                                        Disable 2FA
                                    </button>
                                ) : (
                                    <button className="btn btn__small" onClick={handleOpenMfaModal}>
                                        Enable 2FA
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {statusMessage && !showMfaModal && (
                        <p style={{ marginTop: '8px', color: statusMessage.includes('disabled') ? '#2ecc71' : '#e74c3c' }}>
                            {statusMessage}
                        </p>
                    )}
                </div>
            </div>

            {/* MFA ENROLLMENT MODAL */}
            {showMfaModal && (
                <div className="modal__backdrop" onClick={handleCloseMfaModal}>
                    <div className="modal__box" onClick={(e) => e.stopPropagation()}>
                        <h2>Enable Two-Factor Auth</h2>
                        <p style={{ color: '#666', fontSize: '15px' }}>
                            Add your mobile phone number to secure your account with SMS verification codes.
                        </p>

                        {statusMessage && (
                            <p style={{ color: statusMessage.includes('successfully') ? '#2ecc71' : '#e74c3c', fontSize: '15px', marginTop: '8px' }}>
                                {statusMessage}
                            </p>
                        )}

                        <div id="mfa-enroll-recaptcha-container"></div>
                        {!verificationId ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                                <p className="input__title--text">Phone Number</p>
                                <input
                                    type="tel"
                                    placeholder="+1 555-555-5555"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                />
                                <div className="modal__actions">
                                    <button type="button" className="btn__cancel" onClick={handleCloseMfaModal}>
                                        Cancel
                                    </button>
                                    <button type="button" className="btn" onClick={handleSendEnrollmentCode}>
                                        Send SMS Code
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                                <p className="input__title--text">SMS Verification Code</p>
                                <input
                                    type="text"
                                    placeholder="6-digit code"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                />
                                <div className="modal__actions">
                                    <button type="button" className="btn__cancel" onClick={handleCloseMfaModal}>
                                        Cancel
                                    </button>

                                    <button type="button" className="btn" onClick={handleVerifyEnrollmentCode}>
                                        Verify & Enroll
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default Account