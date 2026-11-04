import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PrivateRoute from "./PrivateRoute";
import SideNav from "./SideNav";

function session(rol, paginas) {
    localStorage.setItem("token", `e30.${btoa(JSON.stringify({ rol, paginas, name: "Prueba" }))}.firma`);
}

afterEach(() => localStorage.clear());

test.each([
    ["admin", [], true],
    ["admin", ["inicio"], true],
    ["dibujante", ["configuraciones"], true],
    ["soporte", ["inicio", "soporte", "configuraciones"], true],
    ["soporte", ["inicio", "soporte"], false],
    ["dibujante", [], false],
])("el rol %s con paginas %j tiene acceso a Configuraciones: %s", (rol, paginas, allowed) => {
    session(rol, paginas);
    render(<MemoryRouter initialEntries={["/configuraciones"]}>
        <Routes>
            <Route path="/configuraciones" element={<PrivateRoute requiredPage="configuraciones" allowedRoles={["admin"]}>
                <div>Editor de plantillas</div>
            </PrivateRoute>} />
            <Route path="/login" element={<div>Iniciar sesion</div>} />
        </Routes>
    </MemoryRouter>);
    expect(screen.getByText(allowed ? "Editor de plantillas" : "Iniciar sesion")).toBeInTheDocument();
});

test("sin sesion no permite abrir el editor", () => {
    render(<MemoryRouter initialEntries={["/configuraciones"]}><Routes>
        <Route path="/configuraciones" element={<PrivateRoute requiredPage="configuraciones" allowedRoles={["admin"]}>
            <div>Editor de plantillas</div>
        </PrivateRoute>} />
        <Route path="/login" element={<div>Iniciar sesion</div>} />
    </Routes></MemoryRouter>);
    expect(screen.getByText("Iniciar sesion")).toBeInTheDocument();
});

test.each([
    ["admin", [], true],
    ["dibujante", ["configuraciones"], true],
    ["soporte", ["inicio", "soporte"], false],
])("el menu de %s respeta el permiso de Configuraciones", (rol, paginas, allowed) => {
    session(rol, paginas);
    render(<MemoryRouter><SideNav /></MemoryRouter>);
    const link = screen.queryByRole("link", { name: "Configuraciones" });
    if (allowed) expect(link).toHaveAttribute("href", "/configuraciones");
    else expect(link).not.toBeInTheDocument();
});
