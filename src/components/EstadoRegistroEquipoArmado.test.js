import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import EstadoRegistroEquipoArmado from "./EstadoRegistroEquipoArmado";

test("habilitar sin serie quita No aplica sin inventar una serie", () => {
    const onChange = jest.fn();
    render(<EstadoRegistroEquipoArmado equipo={{ nombre: "PC", estado_registro: "no_aplica", numero_serie: "" }} onChange={onChange} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "normal" } });
    expect(onChange).toHaveBeenCalledWith({ estado_registro: "normal", observacion_registro: "" });
});

test("No aplica limpia serie y codigo y vuelve al bulto pendiente como en mobile", () => {
    const onChange = jest.fn();
    render(<EstadoRegistroEquipoArmado equipo={{ nombre: "PC", estado_registro: "normal", numero_serie: "123" }} onChange={onChange} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "no_aplica" } });
    expect(onChange).toHaveBeenCalledWith({ estado_registro: "no_aplica", observacion_registro: "", numero_serie: "", codigo: "", caja: "Pendiente de caja" });
});

test("Pendiente permite indicar su motivo y Habilitado lo limpia", () => {
    const Vista = () => {
        const [equipo, setEquipo] = useState({ nombre: "PC", estado_registro: "normal" });
        return <EstadoRegistroEquipoArmado equipo={equipo} onChange={(cambios) => setEquipo((actual) => ({ ...actual, ...cambios }))} />;
    };
    render(<Vista />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "pendiente" } });
    expect(screen.getByRole("textbox")).toBeRequired();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Falta energia" } });
    expect(screen.getByRole("textbox")).toHaveValue("Falta energia");
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "normal" } });
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
});
