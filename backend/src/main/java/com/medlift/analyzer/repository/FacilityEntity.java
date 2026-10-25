package com.medlift.analyzer.repository;

import com.medlift.analyzer.domain.Facility;
import com.medlift.analyzer.domain.FacilityType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "facility")
public class FacilityEntity {

    @Id
    private Long id;

    private String code;
    private String name;
    private String city;

    @Enumerated(EnumType.STRING)
    @Column(name = "facility_type")
    private FacilityType type;

    private double latitude;
    private double longitude;

    @Column(name = "has_drone_pad")
    private boolean hasDronePad;

    @Column(name = "daily_shipments")
    private int dailyShipments;

    protected FacilityEntity() {}

    public Facility toDomain() {
        return new Facility(id, code, name, city, type, latitude, longitude, hasDronePad, dailyShipments);
    }
}
