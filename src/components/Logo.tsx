import { asset } from '../lib/format'

export function Logo({ className = 'logo' }: { className?: string }) {
  return <img className={className} src={asset('logo.svg')} alt="ANNmodels" />
}
