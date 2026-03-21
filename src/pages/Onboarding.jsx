import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { driverAPI } from '../services/api'
import { Btn, Input, Select, FileUpload } from '../components/ui'
import toast from 'react-hot-toast'

const STEPS = [
  { id: 1, title: 'Personal Info', desc: 'Tell us about yourself', icon: '👤' },
  { id: 2, title: "Driver's License", desc: 'Upload your license details', icon: '📄' },
  { id: 3, title: 'Your Vehicle', desc: 'Add your vehicle information', icon: '🚗' },
  { id: 4, title: 'Documents', desc: 'Identity verification docs', icon: '🔒' },
  { id: 5, title: 'Terms', desc: 'Review and agree', icon: '✅' },
]

export default function Onboarding() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const nav = useNavigate()

  const [p, setP] = useState({ fullname: '', dob: '', gender: '', address: '', city: '', state: '', country: '', avatar: null })
  const [l, setL] = useState({ licensenumber: '', licenseexpiry: '', licenseimage: null })
  const [v, setV] = useState({ make: '', model: '', year: '', color: '', plate_number: '', category: '', seats: '4', vehicle_image: null })
  const [d, setD] = useState({ national_id_image: null, selfie_image: null, proof_of_address: null })
  const [agreed, setAgreed] = useState(false)

  useEffect(() => {
    const fetchStep = async () => {
      try {
        const res = await driverAPI.getProfile()
        const profile = res.data.driver
        if (profile.IsOnboardingCompleted) { nav('/driver'); return }
        const currentStep = profile.OnboardingStep || 1
        setStep(currentStep)
        if (currentStep > 1) toast(`Resuming from step ${currentStep}`, { icon: '📋' })
      } catch (e) {
        setStep(1)
      } finally {
        setProfileLoading(false)
      }
    }
    fetchStep()
  }, [])

  const sp = (setter, k) => e => setter(s => ({ ...s, [k]: e.target.value }))
  const sfp = (setter, k) => e => setter(s => ({ ...s, [k]: e.target.files[0] }))

  const submit = async (fn, data, next) => {
    setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(data).forEach(([k, val]) => val && fd.append(k, val))
      await fn(fd)
      toast.success('Saved!')
      setStep(next)
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed')
    } finally { setLoading(false) }
  }

  const submitTerms = async () => {
    if (!agreed) { toast.error('Please agree to terms'); return }
    setLoading(true)
    try {
      await driverAPI.completeOnboarding({ agree_terms: true })
      toast.success('Onboarding complete! Pending admin approval.')
      nav('/driver')
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed')
    } finally { setLoading(false) }
  }

  if (profileLoading) return (
    <div className="fixed inset-0 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center font-sans">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
        <p className="text-zinc-500 text-sm font-medium">Loading your progress...</p>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-zinc-50 dark:bg-zinc-950 overflow-y-auto font-sans">
      <div className="flex flex-col items-center p-4 pt-8 pb-20 min-h-full">
        <div className="w-full max-w-md">

          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-zinc-900 dark:text-white font-display">
              Driv<span className="text-brand">o</span>
            </h1>
            <p className="text-zinc-500 text-sm mt-1">Driver Onboarding</p>
          </div>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-zinc-500 font-medium">Step {step} of {STEPS.length}</p>
              <p className="text-xs font-semibold text-brand">{Math.round((step / STEPS.length) * 100)}%</p>
            </div>
            <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-brand rounded-full"
                animate={{ width: `${(step / STEPS.length) * 100}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
            <div className="flex justify-between mt-3">
              {STEPS.map(s => (
                <div key={s.id} className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    step > s.id ? 'bg-brand text-white' :
                    step === s.id ? 'bg-brand/10 text-brand border-2 border-brand' :
                    'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'
                  }`}>
                    {step > s.id ? '✓' : s.icon}
                  </div>
                  <p className="text-[10px] text-zinc-400 hidden sm:block">{s.title}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Step card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 space-y-5">
                <div>
                  <h2 className="font-display font-bold text-xl text-zinc-900 dark:text-white">{STEPS[step - 1].title}</h2>
                  <p className="text-zinc-500 text-sm mt-0.5">{STEPS[step - 1].desc}</p>
                </div>

                {/* STEP 1 */}
                {step === 1 && <>
                  <Input label="Full Name" placeholder="John Doe" value={p.fullname} onChange={sp(setP, 'fullname')} />
                  <Input label="Date of Birth" type="date" value={p.dob} onChange={sp(setP, 'dob')} />
                  <Select label="Gender" value={p.gender} onChange={sp(setP, 'gender')}>
                    <option value="">Select gender</option>
                    <option>male</option>
                    <option>female</option>
                    <option>other</option>
                  </Select>
                  <Input label="Address" placeholder="123 Main Street" value={p.address} onChange={sp(setP, 'address')} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="City" placeholder="Lagos" value={p.city} onChange={sp(setP, 'city')} />
                    <Input label="State" placeholder="Lagos State" value={p.state} onChange={sp(setP, 'state')} />
                  </div>
                  <Input label="Country" placeholder="Nigeria" value={p.country} onChange={sp(setP, 'country')} />
                  <FileUpload label="Profile Photo" value={p.avatar} onChange={sfp(setP, 'avatar')} />
                  <Btn size="lg" loading={loading} onClick={() => submit(driverAPI.updateProfile, p, 2)}>
                    Save & Continue →
                  </Btn>
                </>}

                {/* STEP 2 */}
                {step === 2 && <>
                  <Input label="License Number" placeholder="DVN-XXXXX" value={l.licensenumber} onChange={sp(setL, 'licensenumber')} />
                  <Input label="License Expiry" type="date" value={l.licenseexpiry} onChange={sp(setL, 'licenseexpiry')} />
                  <FileUpload label="License Image" value={l.licenseimage} onChange={sfp(setL, 'licenseimage')} />
                  <div className="flex gap-3">
                    <Btn variant="ghost" className="flex-1" onClick={() => setStep(1)}>← Back</Btn>
                    <Btn className="flex-1" loading={loading} onClick={() => submit(driverAPI.updateLicense, l, 3)}>Save & Continue →</Btn>
                  </div>
                </>}

                {/* STEP 3 */}
                {step === 3 && <>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Make" placeholder="Toyota" value={v.make} onChange={sp(setV, 'make')} />
                    <Input label="Model" placeholder="Camry" value={v.model} onChange={sp(setV, 'model')} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Year" type="number" placeholder="2020" value={v.year} onChange={sp(setV, 'year')} />
                    <Input label="Color" placeholder="Black" value={v.color} onChange={sp(setV, 'color')} />
                  </div>
                  <Input label="Plate Number" placeholder="LAG-123-AB" value={v.plate_number} onChange={sp(setV, 'plate_number')} />
                  <div className="grid grid-cols-2 gap-3">
                    <Select label="Category" value={v.category} onChange={sp(setV, 'category')}>
                      <option value="">Select</option>
                      <option>economy</option>
                      <option>standard</option>
                      <option>premium</option>
                    </Select>
                    <Input label="Seats" type="number" placeholder="4" value={v.seats} onChange={sp(setV, 'seats')} />
                  </div>
                  <FileUpload label="Vehicle Photo" value={v.vehicle_image} onChange={sfp(setV, 'vehicle_image')} />
                  <div className="flex gap-3">
                    <Btn variant="ghost" className="flex-1" onClick={() => setStep(2)}>← Back</Btn>
                    <Btn className="flex-1" loading={loading} onClick={() => submit(driverAPI.addVehicle, v, 4)}>Save & Continue →</Btn>
                  </div>
                </>}

                {/* STEP 4 */}
                {step === 4 && <>
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-3 text-xs text-zinc-500 flex items-start gap-2">
                    <span>🔒</span> Documents are encrypted and used only for verification.
                  </div>
                  <FileUpload label="National ID" value={d.national_id_image} onChange={sfp(setD, 'national_id_image')} />
                  <FileUpload label="Selfie / Photo" value={d.selfie_image} onChange={sfp(setD, 'selfie_image')} />
                  <FileUpload label="Proof of Address" value={d.proof_of_address} onChange={sfp(setD, 'proof_of_address')} />
                  <div className="flex gap-3">
                    <Btn variant="ghost" className="flex-1" onClick={() => setStep(3)}>← Back</Btn>
                    <Btn className="flex-1" loading={loading} onClick={() => submit(driverAPI.uploadDocuments, d, 5)}>Upload & Continue →</Btn>
                  </div>
                </>}

                {/* STEP 5 */}
                {step === 5 && <>
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-4 max-h-44 overflow-y-auto scrollbar-hide text-xs text-zinc-500 space-y-2 leading-relaxed">
                    <p className="font-semibold text-zinc-900 dark:text-white text-sm">Drivo Driver Terms & Conditions</p>
                    <p>By joining Drivo as a driver, you agree to maintain professional service standards, keep your vehicle clean and roadworthy, treat all riders with respect, follow all traffic laws, maintain accurate GPS location while on duty, and accept that Drivo may deactivate your account for violations.</p>
                    <p>You also agree to complete all trips to the best of your ability and not cancel excessively.</p>
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                    <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 w-4 h-4 accent-brand" />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">I have read and agree to the Drivo Driver Terms & Conditions</span>
                  </label>
                  <div className="flex gap-3">
                    <Btn variant="ghost" className="flex-1" onClick={() => setStep(4)}>← Back</Btn>
                    <Btn className="flex-1" loading={loading} onClick={submitTerms} disabled={!agreed}>Complete ✓</Btn>
                  </div>
                </>}

              </div>
            </motion.div>
          </AnimatePresence>

        </div>
      </div>
    </div>
  )
}