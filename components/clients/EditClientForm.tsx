"use client";

import { useFormState } from "react-dom";
import { useEffect } from "react";
import type { ActionResult } from "@/app/(protected)/clients/actions";
import { updateClient } from "@/app/(protected)/clients/actions";

const initialState: ActionResult = { success: true, message: "" };

export interface ClientFormValues {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  birthDate: string | null;
  clientType: string | null;
  policyType: string | null;
  policyStartDate: string | null;
  policyEndDate: string | null;
  firstSavings: number;
  currentSavings: number;
}

interface Props {
  client: ClientFormValues;
  supportsBirthDate?: boolean;
  supportsPolicyColumns?: boolean;
  onComplete?: () => void;
}

const policyTypeOptions = [
  { value: "Kasko", label: "Kasko" },
  { value: "Sağlık sigortası", label: "Sağlık sigortası" },
  { value: "Trafik sigortası", label: "Trafik sigortası" },
  { value: "DASK sigortası", label: "DASK sigortası" }
] as const;

export function EditClientForm({ client, supportsBirthDate = false, supportsPolicyColumns = false, onComplete }: Props) {
  const [state, formAction] = useFormState(updateClient, initialState);
  const policyValue = client.policyType ?? "";
  const hasCustomPolicyValue =
    supportsPolicyColumns && policyValue && !policyTypeOptions.some((option) => option.value === policyValue);

  useEffect(() => {
    if (state.success && state.message) {
      onComplete?.();
    }
  }, [state.success, state.message, onComplete]);

  return (
    <form action={formAction} className="card-section" style={{ marginTop: "0.5rem" }}>
      <input type="hidden" name="id" value={client.id} />
      <input type="hidden" name="supportsBirthDate" value={supportsBirthDate ? "1" : "0"} />
      <input type="hidden" name="supportsPolicyColumns" value={supportsPolicyColumns ? "1" : "0"} />
      <div className="form-grid">
        <label className="form-field">
          <span>Ad Soyad</span>
          <input name="name" defaultValue={client.name} required className="input-field" />
        </label>
        <label className="form-field">
          <span>E-posta</span>
          <input name="email" type="email" defaultValue={client.email} required className="input-field" />
        </label>
        <label className="form-field">
          <span>Telefon</span>
          <input name="phone" defaultValue={client.phone ?? ""} className="input-field" />
        </label>
        {supportsBirthDate && (
          <label className="form-field">
            <span>Doğum tarihi</span>
            <input name="birthDate" type="date" defaultValue={client.birthDate ?? ""} className="input-field" />
          </label>
        )}
        {supportsPolicyColumns && (
          <label className="form-field">
            <span>Müşteri türü</span>
            <select name="clientType" defaultValue={client.clientType ?? ""} className="input-field">
              <option value="">Seçiniz</option>
              <option value="BES">BES</option>
              <option value="ES">ES</option>
              <option value="BES+ES">BES + ES</option>
            </select>
          </label>
        )}
        <label className="form-field">
          <span>İlk tasarruf</span>
          <input
            name="firstSavings"
            type="number"
            min="0"
            step="0.01"
            defaultValue={client.firstSavings}
            required
            className="input-field"
          />
        </label>
        <label className="form-field">
          <span>Güncel tasarruf</span>
          <input
            name="currentSavings"
            type="number"
            min="0"
            step="0.01"
            defaultValue={client.currentSavings}
            required
            className="input-field"
          />
        </label>
        {supportsPolicyColumns && (
          <label className="form-field">
            <span>Poliçe türü</span>
            <select name="policyType" defaultValue={policyValue} className="input-field">
              <option value="">Seçiniz</option>
              {policyTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
              {hasCustomPolicyValue ? (
                <option value={policyValue}>{policyValue}</option>
              ) : null}
            </select>
          </label>
        )}
        {supportsPolicyColumns && (
          <label className="form-field">
            <span>Poliçe başlangıcı</span>
            <input name="policyStartDate" type="date" defaultValue={client.policyStartDate ?? ""} className="input-field" />
          </label>
        )}
        {supportsPolicyColumns && (
          <label className="form-field">
            <span>Poliçe bitişi</span>
            <input name="policyEndDate" type="date" defaultValue={client.policyEndDate ?? ""} className="input-field" />
          </label>
        )}
      </div>
      {state.message && (
        <p
          style={{
            margin: 0,
            padding: "0.4rem 0.6rem",
            borderRadius: "6px",
            background: state.success ? "rgba(20, 80, 163, 0.08)" : "rgba(228, 70, 70, 0.1)",
            color: state.success ? "var(--accent)" : "#a40000"
          }}
        >
          {state.message}
        </p>
      )}
      <button
        type="submit"
        className="btn btn-primary"
        style={{ alignSelf: "flex-start" }}
      >
        Müşteriyi güncelle
      </button>
    </form>
  );
}
